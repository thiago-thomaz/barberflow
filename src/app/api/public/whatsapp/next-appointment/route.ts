import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizeWhatsAppPhone } from '@/lib/whatsapp/engine';
import { cancelAppointmentReminders } from '@/lib/whatsapp/reminders';
import { publishEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';

// GET /api/public/whatsapp/next-appointment - Query next appointment by phone
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');
    const slug = searchParams.get('slug') || 'barbearia-imperial';

    if (!phone) {
      return NextResponse.json({ error: 'Parâmetro phone obrigatório' }, { status: 400 });
    }

    const normalizedPhone = normalizeWhatsAppPhone(phone);
    const shop = await prisma.barbershop.findUnique({ where: { slug } });
    if (!shop) return NextResponse.json({ error: 'Barbearia não encontrada' }, { status: 404 });

    const now = new Date();
    const app = await prisma.appointment.findFirst({
      where: {
        barbershopId: shop.id,
        customer: { phone: { contains: normalizedPhone.slice(-8) } },
        status: { in: ['AGENDADO', 'CONFIRMADO'] },
        scheduledAt: { gte: now },
      },
      include: { customer: true, barber: true, service: true },
      orderBy: { scheduledAt: 'asc' },
    });

    if (!app) {
      return NextResponse.json({ hasAppointment: false, appointment: null });
    }

    return NextResponse.json({
      hasAppointment: true,
      appointment: {
        id: app.id,
        publicToken: app.publicToken,
        scheduledAt: app.scheduledAt,
        endAt: app.endAt,
        service: app.service?.name || app.serviceNameSnapshot,
        barber: app.barber?.name,
        price: app.price,
        status: app.status,
        publicUrl: `https://barber.projetosunion.cloud/agendamento/${app.publicToken}`,
        icsCalendarUrl: `/api/calendar/appointment/${app.publicToken}.ics`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao consultar próximo agendamento' }, { status: 500 });
  }
}

// POST /api/public/whatsapp/next-appointment - Cancel appointment via WhatsApp
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { appointmentId, phone, reason } = body;

    if (!appointmentId) {
      return NextResponse.json({ error: 'Parâmetro appointmentId obrigatório' }, { status: 400 });
    }

    const app = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { customer: true },
    });

    if (!app) return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });

    // Verify phone match if supplied
    if (phone) {
      const normPhone = normalizeWhatsAppPhone(phone);
      if (!app.customer.phone.includes(normPhone.slice(-8))) {
        return NextResponse.json({ error: 'Telefone não corresponde ao agendamento' }, { status: 403 });
      }
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'CANCELADO',
        cancelReason: reason || 'Cancelado via WhatsApp',
        cancelledAt: new Date(),
      },
    });

    await cancelAppointmentReminders(appointmentId);

    await publishEvent(
      'APPOINTMENT_CANCELLED',
      app.barbershopId,
      { appointmentId, reason: reason || 'Cancelado via WhatsApp' },
      { appointmentId }
    ).catch(() => {});

    return NextResponse.json({ success: true, message: 'Agendamento cancelado com sucesso' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao cancelar agendamento' }, { status: 500 });
  }
}
