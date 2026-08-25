import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { publishEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';

// GET /api/public/appointment/[token] - View appointment details by publicToken
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { publicToken: params.token },
      include: {
        barbershop: {
          select: {
            name: true,
            slug: true,
            phone: true,
            address: true,
            city: true,
          },
        },
        customer: { select: { name: true, phone: true } },
        barber: { select: { name: true, specialty: true } },
        service: { select: { name: true, durationMin: true, price: true } },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ appointment });
  } catch (error: any) {
    console.error('Error fetching public appointment:', error);
    return NextResponse.json({ error: 'Erro ao consultar agendamento' }, { status: 500 });
  }
}

// PATCH /api/public/appointment/[token] - Customer cancel or reschedule
export async function PATCH(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const body = await req.json();
    const { action, cancelReason, newScheduledAt } = body; // action: 'CANCEL' | 'RESCHEDULE'

    const appointment = await prisma.appointment.findUnique({
      where: { publicToken: params.token },
      include: {
        barbershop: true,
        customer: true,
        barber: true,
        service: true,
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    if (appointment.status === 'CONCLUIDO') {
      return NextResponse.json(
        { error: 'Não é possível alterar um agendamento já concluído' },
        { status: 400 }
      );
    }

    if (action === 'CANCEL') {
      const updated = await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          status: 'CANCELADO',
          cancelReason: cancelReason || 'Cancelado pelo cliente via página pública',
          cancelledAt: new Date(),
        },
      });

      await publishEvent(
        'APPOINTMENT_CANCELLED',
        appointment.barbershopId,
        {
          appointmentId: appointment.id,
          customerName: appointment.customer.name,
          customerPhone: appointment.customer.phone,
          barberName: appointment.barber.name,
          cancelReason: cancelReason || 'Cancelado pelo cliente',
        },
        {
          customerId: appointment.customerId,
          appointmentId: appointment.id,
        }
      );

      return NextResponse.json({ success: true, message: 'Agendamento cancelado', appointment: updated });
    }

    if (action === 'RESCHEDULE') {
      if (!newScheduledAt) {
        return NextResponse.json({ error: 'Nova data e horário são obrigatórios' }, { status: 400 });
      }

      const newStart = new Date(newScheduledAt);
      const newEnd = new Date(newStart.getTime() + appointment.durationMinutes * 60 * 1000);

      // Check conflict
      const conflict = await prisma.appointment.findFirst({
        where: {
          id: { not: appointment.id },
          barberId: appointment.barberId,
          barbershopId: appointment.barbershopId,
          status: { notIn: ['CANCELADO', 'NO_SHOW'] },
          AND: [
            { scheduledAt: { lt: newEnd } },
            { endAt: { gt: newStart } },
          ],
        },
      });

      if (conflict) {
        return NextResponse.json({ error: 'Horário indisponível, escolha outro horário' }, { status: 409 });
      }

      const updated = await prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          scheduledAt: newStart,
          endAt: newEnd,
          status: 'AGENDADO',
        },
      });

      return NextResponse.json({ success: true, message: 'Agendamento remarcado', appointment: updated });
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
  } catch (error: any) {
    console.error('Error modifying public appointment:', error);
    return NextResponse.json({ error: 'Erro ao processar solicitação' }, { status: 500 });
  }
}
