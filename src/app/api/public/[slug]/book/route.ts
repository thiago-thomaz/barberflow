import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publishEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';

// POST /api/public/[slug]/book - Public booking without requiring customer login
export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const shop = await prisma.barbershop.findUnique({
      where: { slug: params.slug },
      include: {
        services: { where: { isActive: true, deletedAt: null } },
        barbers: { where: { isActive: true, deletedAt: null } },
      },
    });

    if (!shop) {
      return NextResponse.json({ error: 'Barbearia não encontrada' }, { status: 404 });
    }

    const body = await req.json();
    const {
      serviceId,
      barberId, // Specific ID or 'ANY'
      date, // YYYY-MM-DD
      time, // HH:MM
      customerName,
      customerPhone,
      notes,
    } = body;

    if (!serviceId || !date || !time || !customerName || !customerPhone) {
      return NextResponse.json(
        { error: 'Serviço, data, horário, seu nome e WhatsApp são obrigatórios' },
        { status: 400 }
      );
    }

    const service = shop.services.find((s) => s.id === serviceId);
    if (!service) {
      return NextResponse.json({ error: 'Serviço selecionado não está disponível' }, { status: 404 });
    }

    const duration = service.durationMin || 30;
    // Explicitly parse in Brazil UTC-3 timezone
    const dateTimeStr = date.includes('T') ? date : `${date}T${time}:00-03:00`;
    const startDateTime = new Date(dateTimeStr);
    if (isNaN(startDateTime.getTime())) {
      return NextResponse.json({ error: 'Data e horário inválidos' }, { status: 400 });
    }

    const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 1000);

    // Business hours check
    const dayOfWeek = startDateTime.getDay();
    const businessHours = await prisma.businessHours.findUnique({
      where: {
        barbershopId_dayOfWeek: {
          barbershopId: shop.id,
          dayOfWeek,
        },
      },
    });

    if (!businessHours || !businessHours.isOpen) {
      return NextResponse.json(
        { error: 'A barbearia não abre neste dia da semana' },
        { status: 400 }
      );
    }

    const [openH, openM] = businessHours.openTime.split(':').map(Number);
    const [closeH, closeM] = businessHours.closeTime.split(':').map(Number);
    const appStartMin = startDateTime.getHours() * 60 + startDateTime.getMinutes();
    const appEndMin = endDateTime.getHours() * 60 + endDateTime.getMinutes();

    if (appStartMin < openH * 60 + openM || appEndMin > closeH * 60 + closeM) {
      return NextResponse.json(
        { error: 'Horário fora do expediente da barbearia' },
        { status: 400 }
      );
    }

    // Clean customer phone numbers
    const cleanPhone = customerPhone.replace(/\D/g, '');
    if (cleanPhone.length < 8) {
      return NextResponse.json({ error: 'Telefone inválido' }, { status: 400 });
    }

    let isNewCustomer = false;

    // Atomic Booking in Transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Find or create Customer in this tenant
      let customer = await tx.customer.findFirst({
        where: {
          barbershopId: shop.id,
          phone: { contains: cleanPhone.slice(-8) },
          deletedAt: null,
        },
      });

      if (!customer) {
        isNewCustomer = true;
        customer = await tx.customer.create({
          data: {
            barbershopId: shop.id,
            name: customerName.trim(),
            phone: customerPhone.trim(),
            status: 'NOVO',
          },
        });

        await tx.customerVisitStats.create({
          data: {
            customerId: customer.id,
            totalVisits: 0,
            totalSpent: 0,
            avgTicket: 0,
            avgDaysBetweenVisits: 30,
            medianDaysBetween: 30,
          },
        });
      }

      // 2. Determine target Barber
      let chosenBarber = null;

      if (barberId && barberId !== 'ANY') {
        chosenBarber = shop.barbers.find((b) => b.id === barberId);
        if (!chosenBarber) throw new Error('BARBER_NOT_FOUND');

        // Check conflict
        const conflict = await tx.appointment.findFirst({
          where: {
            barberId: chosenBarber.id,
            barbershopId: shop.id,
            status: { notIn: ['CANCELADO', 'NO_SHOW'] },
            AND: [
              { scheduledAt: { lt: endDateTime } },
              { endAt: { gt: startDateTime } },
            ],
          },
        });

        if (conflict) throw new Error('SCHEDULE_CONFLICT');
      } else {
        // Find any available barber
        for (const candidate of shop.barbers) {
          const conflict = await tx.appointment.findFirst({
            where: {
              barberId: candidate.id,
              barbershopId: shop.id,
              status: { notIn: ['CANCELADO', 'NO_SHOW'] },
              AND: [
                { scheduledAt: { lt: endDateTime } },
                { endAt: { gt: startDateTime } },
              ],
            },
          });

          if (!conflict) {
            chosenBarber = candidate;
            break;
          }
        }

        if (!chosenBarber) throw new Error('NO_BARBER_AVAILABLE');
      }

      // 3. Create Appointment with Snapshot and unique Public Token
      const appointment = await tx.appointment.create({
        data: {
          barbershopId: shop.id,
          customerId: customer.id,
          barberId: chosenBarber.id,
          serviceId: service.id,
          scheduledAt: startDateTime,
          endAt: endDateTime,
          durationMinutes: duration,
          price: service.price,
          serviceNameSnapshot: service.name,
          servicePriceSnapshot: service.price,
          notes: notes?.trim() || null,
          status: 'AGENDADO',
        },
        include: {
          customer: true,
          barber: true,
          service: true,
        },
      });

      return { appointment, customer, barber: chosenBarber, service };
    });

    if (isNewCustomer) {
      await publishEvent(
        'CUSTOMER_CREATED',
        shop.id,
        {
          customerName: result.customer.name,
          customerPhone: result.customer.phone,
        },
        { customerId: result.customer.id }
      ).catch((err) => console.warn('Failed to publish CUSTOMER_CREATED:', err));
    }

    // Publish APPOINTMENT_CREATED event
    await publishEvent(
      'APPOINTMENT_CREATED',
      shop.id,
      {
        appointmentId: result.appointment.id,
        publicToken: result.appointment.publicToken,
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
    ).catch((err) => console.warn('Failed to publish APPOINTMENT_CREATED:', err));

    return NextResponse.json(
      {
        success: true,
        publicToken: result.appointment.publicToken,
        appointment: {
          id: result.appointment.id,
          publicToken: result.appointment.publicToken,
          scheduledAt: result.appointment.scheduledAt,
          durationMinutes: result.appointment.durationMinutes,
          price: result.appointment.price,
          serviceName: result.service.name,
          barberName: result.barber.name,
          customerName: result.customer.name,
          shopName: shop.name,
          shopPhone: shop.phone,
          shopAddress: shop.address,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Public Booking error:', error);
    if (error.message === 'SCHEDULE_CONFLICT' || error.message === 'NO_BARBER_AVAILABLE') {
      return NextResponse.json(
        { error: 'Este horário acabou de ser preenchido. Por favor, escolha outro horário disponível.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: error.message || 'Erro ao processar agendamento' },
      { status: 500 }
    );
  }
}
