import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processDueReminders } from '@/lib/whatsapp/reminders';

export const dynamic = 'force-dynamic';

// GET /api/internal/reminders/due - List pending due reminders for n8n cron or background monitor
export async function GET(req: NextRequest) {
  try {
    const now = new Date();
    const dueReminders = await prisma.appointmentReminder.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: { lte: now },
        appointment: {
          status: { in: ['AGENDADO', 'CONFIRMADO'] },
        },
      },
      include: {
        appointment: {
          include: {
            customer: true,
            barber: true,
            service: true,
            barbershop: true,
          },
        },
      },
      take: 50,
    });

    return NextResponse.json({
      count: dueReminders.length,
      dueReminders: dueReminders.map((r) => ({
        id: r.id,
        reminderType: r.reminderType,
        scheduledFor: r.scheduledFor,
        appointmentId: r.appointmentId,
        customerName: r.appointment.customer.name,
        customerPhone: r.appointment.customer.whatsappPhone || r.appointment.customer.phone,
        serviceName: r.appointment.service.name,
        barberName: r.appointment.barber.name,
        barbershopName: r.appointment.barbershop.name,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao consultar lembretes vencidos' }, { status: 500 });
  }
}

// POST /api/internal/reminders/due - Trigger immediate processing of all due reminders
export async function POST(req: NextRequest) {
  try {
    const result = await processDueReminders(50);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao processar lembretes vencidos', details: error.message }, { status: 500 });
  }
}
