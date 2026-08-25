import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/tenant';
import { publishEvent } from '@/lib/events';

// GET /api/appointments - List appointments with filters (date range, barberId, status)
export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const barberId = searchParams.get('barberId');
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');

    const whereClause: any = {
      barbershopId: session.barbershopId,
    };

    if (startDateParam && endDateParam) {
      const start = new Date(startDateParam);
      const end = new Date(endDateParam);
      whereClause.scheduledAt = {
        gte: start,
        lte: end,
      };
    } else if (startDateParam) {
      const start = new Date(startDateParam);
      const end = new Date(startDateParam);
      end.setHours(23, 59, 59, 999);
      whereClause.scheduledAt = {
        gte: start,
        lte: end,
      };
    }

    if (barberId && barberId !== 'ALL') {
      whereClause.barberId = barberId;
    }

    if (customerId) {
      whereClause.customerId = customerId;
    }

    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        barber: { select: { id: true, name: true } },
        service: { select: { id: true, name: true, durationMin: true, price: true } },
        payment: true,
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return NextResponse.json({ appointments });
  } catch (error: any) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json({ error: 'Erro ao buscar agendamentos' }, { status: 500 });
  }
}

// POST /api/appointments - Create new appointment with strict interval overlap anti-conflict & concurrency safety
export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const {
      customerId,
      barberId,
      serviceId,
      scheduledAt, // ISO string or parsable date
      notes,
    } = body;

    if (!customerId || !barberId || !serviceId || !scheduledAt) {
      return NextResponse.json(
        { error: 'Cliente, Barbeiro, Serviço e Data/Horário são obrigatórios' },
        { status: 400 }
      );
    }

    const startDateTime = new Date(scheduledAt);
    if (isNaN(startDateTime.getTime())) {
      return NextResponse.json({ error: 'Data e horário inválidos' }, { status: 400 });
    }

    // 1. Transaction to prevent race conditions and ensure full entity ownership & conflict validation
    const result = await prisma.$transaction(
      async (tx) => {
        // Validate Tenant & Active Barber
        const barber = await tx.barber.findFirst({
          where: {
            id: barberId,
            barbershopId: session.barbershopId!,
            deletedAt: null,
          },
        });

        if (!barber) {
          throw new Error('BARBER_NOT_FOUND');
        }
        if (!barber.isActive) {
          throw new Error('BARBER_INACTIVE');
        }

        // Validate Tenant & Customer
        const customer = await tx.customer.findFirst({
          where: {
            id: customerId,
            barbershopId: session.barbershopId!,
            deletedAt: null,
          },
        });

        if (!customer) {
          throw new Error('CUSTOMER_NOT_FOUND');
        }

        // Validate Tenant & Active Service
        const service = await tx.service.findFirst({
          where: {
            id: serviceId,
            barbershopId: session.barbershopId!,
            deletedAt: null,
          },
        });

        if (!service) {
          throw new Error('SERVICE_NOT_FOUND');
        }
        if (!service.isActive) {
          throw new Error('SERVICE_INACTIVE');
        }

        const durationMinutes = service.durationMin || 30;
        const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

        // 2. Validate Business Hours for Day of Week
        const dayOfWeek = startDateTime.getDay(); // 0 (Sun) to 6 (Sat)
        const businessHours = await tx.businessHours.findUnique({
          where: {
            barbershopId_dayOfWeek: {
              barbershopId: session.barbershopId!,
              dayOfWeek,
            },
          },
        });

        if (businessHours) {
          if (!businessHours.isOpen) {
            throw new Error('SHOP_CLOSED_DAY');
          }

          // Check if appointment start and end are within operating hours
          const [openHour, openMin] = businessHours.openTime.split(':').map(Number);
          const [closeHour, closeMin] = businessHours.closeTime.split(':').map(Number);

          const appStartMinOfDay = startDateTime.getHours() * 60 + startDateTime.getMinutes();
          const appEndMinOfDay = endDateTime.getHours() * 60 + endDateTime.getMinutes();
          const shopOpenMinOfDay = openHour * 60 + openMin;
          const shopCloseMinOfDay = closeHour * 60 + closeMin;

          if (appStartMinOfDay < shopOpenMinOfDay || appEndMinOfDay > shopCloseMinOfDay) {
            throw new Error('OUT_OF_BUSINESS_HOURS');
          }
        }

        // 3. Strict Interval Overlap Conflict Check:
        // Overlap Condition: (novo_start < existing_end) AND (new_end > existing_start)
        const conflictingAppointments = await tx.appointment.findMany({
          where: {
            barberId: barber.id,
            barbershopId: session.barbershopId!,
            status: { notIn: ['CANCELADO', 'NO_SHOW'] },
            AND: [
              { scheduledAt: { lt: endDateTime } },
              { endAt: { gt: startDateTime } },
            ],
          },
        });

        if (conflictingAppointments.length > 0) {
          throw new Error('SCHEDULE_CONFLICT');
        }

        // 4. Create appointment with snapshots
        const appointment = await tx.appointment.create({
          data: {
            barbershopId: session.barbershopId!,
            customerId: customer.id,
            barberId: barber.id,
            serviceId: service.id,
            scheduledAt: startDateTime,
            endAt: endDateTime,
            durationMinutes,
            price: service.price,
            serviceNameSnapshot: service.name,
            servicePriceSnapshot: service.price,
            notes: notes?.trim() || null,
            status: 'AGENDADO',
          },
          include: {
            customer: { select: { id: true, name: true, phone: true } },
            barber: { select: { id: true, name: true } },
            service: { select: { id: true, name: true, price: true, durationMin: true } },
          },
        });

        return { appointment, customer, barber, service };
      },
      {
        isolationLevel: 'Serializable', // Concurrency protection against race conditions
        timeout: 10000,
      }
    );

    // Audit and events
    await logAuditEvent({
      tenantId: session.barbershopId,
      userId: session.userId,
      action: 'CREATE',
      entity: 'Appointment',
      entityId: result.appointment.id,
      metadata: {
        customer: result.customer.name,
        barber: result.barber.name,
        service: result.service.name,
        scheduledAt: result.appointment.scheduledAt,
      },
    });

    await publishEvent(
      'APPOINTMENT_CREATED',
      session.barbershopId,
      {
        appointmentId: result.appointment.id,
        customerName: result.customer.name,
        customerPhone: result.customer.phone,
        barberName: result.barber.name,
        serviceName: result.service.name,
        price: result.appointment.price,
        scheduledAt: result.appointment.scheduledAt.toISOString(),
      },
      {
        customerId: result.customer.id,
        appointmentId: result.appointment.id,
        barberId: result.barber.id,
        serviceId: result.service.id,
      }
    );

    return NextResponse.json({ success: true, appointment: result.appointment }, { status: 201 });
  } catch (error: any) {
    console.warn('Appointment creation error:', error.message);

    switch (error.message) {
      case 'SCHEDULE_CONFLICT':
        return NextResponse.json(
          { error: 'Conflito de horário: o barbeiro já possui um agendamento neste intervalo' },
          { status: 409 }
        );
      case 'BARBER_NOT_FOUND':
        return NextResponse.json({ error: 'Barbeiro não encontrado neste estabelecimento' }, { status: 404 });
      case 'BARBER_INACTIVE':
        return NextResponse.json({ error: 'Este barbeiro está inativo no momento' }, { status: 400 });
      case 'CUSTOMER_NOT_FOUND':
        return NextResponse.json({ error: 'Cliente não encontrado neste estabelecimento' }, { status: 404 });
      case 'SERVICE_NOT_FOUND':
        return NextResponse.json({ error: 'Serviço não encontrado neste estabelecimento' }, { status: 404 });
      case 'SERVICE_INACTIVE':
        return NextResponse.json({ error: 'Este serviço está inativo no momento' }, { status: 400 });
      case 'SHOP_CLOSED_DAY':
        return NextResponse.json({ error: 'A barbearia não abre neste dia da semana' }, { status: 400 });
      case 'OUT_OF_BUSINESS_HOURS':
        return NextResponse.json({ error: 'O horário selecionado está fora do horário de funcionamento da barbearia' }, { status: 400 });
      default:
        return NextResponse.json({ error: 'Erro ao criar agendamento' }, { status: 500 });
    }
  }
}
