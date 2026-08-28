import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeWhatsAppPhone } from '@/lib/whatsapp/engine';
import { scheduleAppointmentReminders } from '@/lib/whatsapp/reminders';
import { publishEvent } from '@/lib/events';
import { generateGoogleCalendarUrl } from '@/lib/calendar';

export const dynamic = 'force-dynamic';

// POST /api/public/whatsapp/appointments - Official endpoint to create WhatsApp appointments
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      slug,
      barbershopId,
      customerName,
      customerPhone,
      serviceId,
      barberId,
      date,
      time,
      notes,
    } = body;

    if (!customerPhone || !serviceId || !date || !time) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: customerPhone, serviceId, date, time' },
        { status: 400 }
      );
    }

    const shop = await prisma.barbershop.findFirst({
      where: {
        OR: [{ slug: slug || '' }, { id: barbershopId || '' }],
        isActive: true,
      },
      include: {
        services: { where: { id: serviceId, isActive: true, deletedAt: null } },
        barbers: { where: { isActive: true, deletedAt: null } },
      },
    });

    if (!shop || shop.services.length === 0) {
      return NextResponse.json({ error: 'Barbearia ou serviço inválido' }, { status: 404 });
    }

    const service = shop.services[0];
    const normalizedPhone = normalizeWhatsAppPhone(customerPhone);
    const startDateTime = new Date(`${date}T${time}:00-03:00`);
    const endDateTime = new Date(startDateTime.getTime() + service.durationMin * 60 * 1000);

    const booking = await prisma.$transaction(async (tx) => {
      // 1. Find or create Customer
      let customer = await tx.customer.findFirst({
        where: {
          barbershopId: shop.id,
          phone: { contains: normalizedPhone.slice(-8) },
          deletedAt: null,
        },
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            barbershopId: shop.id,
            name: customerName || 'Cliente WhatsApp',
            phone: normalizedPhone,
            whatsappPhone: normalizedPhone,
            status: 'NOVO',
            marketingOptIn: true,
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

      // 2. Select barber with anti-conflict
      let chosenBarber = null;
      if (barberId && barberId !== 'ANY') {
        chosenBarber = shop.barbers.find((b) => b.id === barberId);
        if (!chosenBarber) throw new Error('BARBER_NOT_FOUND');

        const conflict = await tx.appointment.findFirst({
          where: {
            barberId: chosenBarber.id,
            barbershopId: shop.id,
            status: { notIn: ['CANCELADO', 'NO_SHOW'] },
            AND: [{ scheduledAt: { lt: endDateTime } }, { endAt: { gt: startDateTime } }],
          },
        });
        if (conflict) throw new Error('SCHEDULE_CONFLICT');
      } else {
        for (const candidate of shop.barbers) {
          const conflict = await tx.appointment.findFirst({
            where: {
              barberId: candidate.id,
              barbershopId: shop.id,
              status: { notIn: ['CANCELADO', 'NO_SHOW'] },
              AND: [{ scheduledAt: { lt: endDateTime } }, { endAt: { gt: startDateTime } }],
            },
          });
          if (!conflict) {
            chosenBarber = candidate;
            break;
          }
        }
        if (!chosenBarber) throw new Error('NO_BARBER_AVAILABLE');
      }

      // 3. Create Appointment
      const app = await tx.appointment.create({
        data: {
          barbershopId: shop.id,
          customerId: customer.id,
          barberId: chosenBarber.id,
          serviceId: service.id,
          scheduledAt: startDateTime,
          endAt: endDateTime,
          durationMinutes: service.durationMin,
          price: service.price,
          serviceNameSnapshot: service.name,
          servicePriceSnapshot: service.price,
          origin: 'WHATSAPP',
          status: 'AGENDADO',
          notes: notes || null,
        },
        include: { customer: true, barber: true, service: true, barbershop: true },
      });

      return { appointment: app, customer, barber: chosenBarber };
    });

    // Schedule anti-duplicate reminders
    await scheduleAppointmentReminders({
      appointmentId: booking.appointment.id,
      barbershopId: shop.id,
      scheduledAt: booking.appointment.scheduledAt,
    });

    // Webhook Notification Event
    await publishEvent(
      'APPOINTMENT_CREATED',
      shop.id,
      {
        appointmentId: booking.appointment.id,
        publicToken: booking.appointment.publicToken,
        customerName: booking.customer.name,
        customerPhone: booking.customer.phone,
        barberName: booking.barber.name,
        serviceName: service.name,
        price: booking.appointment.price,
        scheduledAt: booking.appointment.scheduledAt.toISOString(),
        origin: 'WHATSAPP',
      },
      {
        customerId: booking.customer.id,
        appointmentId: booking.appointment.id,
        barberId: booking.barber.id,
        serviceId: service.id,
      }
    ).catch(() => {});

    const publicUrl = `https://barber.projetosunion.cloud/agendamento/${booking.appointment.publicToken}`;
    const gcalUrl = generateGoogleCalendarUrl({
      id: booking.appointment.id,
      publicToken: booking.appointment.publicToken,
      scheduledAt: booking.appointment.scheduledAt,
      endAt: booking.appointment.endAt,
      price: booking.appointment.price,
      serviceName: service.name,
      barberName: booking.barber.name,
      shopName: shop.name,
      shopAddress: shop.address,
      publicUrl,
    });

    return NextResponse.json({
      success: true,
      appointment: {
        id: booking.appointment.id,
        publicToken: booking.appointment.publicToken,
        scheduledAt: booking.appointment.scheduledAt,
        endAt: booking.appointment.endAt,
        price: booking.appointment.price,
        service: service.name,
        barber: booking.barber.name,
        customer: booking.customer.name,
        publicUrl,
        googleCalendarUrl: gcalUrl,
        icsCalendarUrl: `/api/calendar/appointment/${booking.appointment.publicToken}.ics`,
      },
    });
  } catch (error: any) {
    if (error.message === 'SCHEDULE_CONFLICT' || error.message === 'NO_BARBER_AVAILABLE') {
      return NextResponse.json(
        { error: 'Horário indisponível ou já reservado', code: 'SCHEDULE_CONFLICT' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Erro ao criar agendamento via WhatsApp', details: error.message }, { status: 500 });
  }
}
