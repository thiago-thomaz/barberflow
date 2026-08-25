import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/tenant';
import { publishEvent } from '@/lib/events';

// POST /api/appointments/[id]/confirm - Confirm appointment
export async function POST(
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
      include: { customer: true, barber: true, service: true },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    if (appointment.status === 'CONCLUIDO' || appointment.status === 'CANCELADO') {
      return NextResponse.json(
        { error: `Não é possível confirmar um agendamento com status ${appointment.status}` },
        { status: 400 }
      );
    }

    const updated = await prisma.appointment.update({
      where: { id: params.id },
      data: { status: 'CONFIRMADO' },
      include: { customer: true, barber: true, service: true },
    });

    await logAuditEvent({
      tenantId: session.barbershopId,
      userId: session.userId,
      action: 'UPDATE',
      entity: 'Appointment',
      entityId: params.id,
      metadata: { newStatus: 'CONFIRMADO' },
    });

    await publishEvent(
      'APPOINTMENT_CONFIRMED',
      session.barbershopId,
      {
        appointmentId: updated.id,
        customerName: updated.customer.name,
        customerPhone: updated.customer.phone,
        barberName: updated.barber.name,
        serviceName: updated.service.name,
        scheduledAt: updated.scheduledAt.toISOString(),
      },
      {
        customerId: updated.customerId,
        appointmentId: updated.id,
        barberId: updated.barberId,
        serviceId: updated.serviceId,
      }
    );

    return NextResponse.json({ success: true, appointment: updated });
  } catch (error: any) {
    console.error('Error confirming appointment:', error);
    return NextResponse.json({ error: 'Erro ao confirmar agendamento' }, { status: 500 });
  }
}
