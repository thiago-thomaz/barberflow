import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/tenant';

// GET /api/appointments/[id] - Get appointment details
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const appointment = await prisma.appointment.findFirst({
      where: { id: params.id, barbershopId: session.barbershopId },
      include: {
        customer: true,
        barber: true,
        service: true,
        payment: true,
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ appointment });
  } catch (error: any) {
    console.error('Error fetching appointment:', error);
    return NextResponse.json({ error: 'Erro ao buscar agendamento' }, { status: 500 });
  }
}

// PATCH /api/appointments/[id] - Edit notes or reschedule
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const existing = await prisma.appointment.findFirst({
      where: { id: params.id, barbershopId: session.barbershopId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const { notes, scheduledAt, barberId, serviceId } = body;

    const dataToUpdate: any = {};
    if (notes !== undefined) dataToUpdate.notes = notes?.trim() || null;

    // Rescheduling validation if date or barber changed
    if (scheduledAt || barberId) {
      const targetBarberId = barberId || existing.barberId;
      const targetStart = scheduledAt ? new Date(scheduledAt) : existing.scheduledAt;
      const targetDuration = existing.durationMinutes || 30;
      const targetEnd = new Date(targetStart.getTime() + targetDuration * 60 * 1000);

      // Check conflict excluding current appointment
      const conflict = await prisma.appointment.findFirst({
        where: {
          id: { not: params.id },
          barberId: targetBarberId,
          barbershopId: session.barbershopId,
          status: { notIn: ['CANCELADO', 'NO_SHOW'] },
          AND: [
            { scheduledAt: { lt: targetEnd } },
            { endAt: { gt: targetStart } },
          ],
        },
      });

      if (conflict) {
        return NextResponse.json(
          { error: 'Conflito de horário com outro agendamento' },
          { status: 409 }
        );
      }

      dataToUpdate.barberId = targetBarberId;
      dataToUpdate.scheduledAt = targetStart;
      dataToUpdate.endAt = targetEnd;
    }

    const updated = await prisma.appointment.update({
      where: { id: params.id },
      data: dataToUpdate,
      include: {
        customer: true,
        barber: true,
        service: true,
      },
    });

    await logAuditEvent({
      tenantId: session.barbershopId,
      userId: session.userId,
      action: 'UPDATE',
      entity: 'Appointment',
      entityId: params.id,
      metadata: { changes: body },
    });

    return NextResponse.json({ success: true, appointment: updated });
  } catch (error: any) {
    console.error('Error updating appointment:', error);
    return NextResponse.json({ error: 'Erro ao atualizar agendamento' }, { status: 500 });
  }
}
