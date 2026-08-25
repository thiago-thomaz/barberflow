import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/tenant';
import { publishEvent } from '@/lib/events';

// POST /api/appointments/[id]/cancel - Cancel appointment with reason
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

    if (appointment.status === 'CONCLUIDO') {
      return NextResponse.json(
        { error: 'Não é possível cancelar um agendamento já concluído' },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const cancelReason = body?.reason?.trim() || 'Cancelado pelo estabelecimento';

    const cancelled = await prisma.appointment.update({
      where: { id: params.id },
      data: {
        status: 'CANCELADO',
        cancelReason,
        cancelledAt: new Date(),
      },
      include: { customer: true, barber: true, service: true },
    });

    await logAuditEvent({
      tenantId: session.barbershopId,
      userId: session.userId,
      action: 'CANCEL',
      entity: 'Appointment',
      entityId: params.id,
      metadata: { reason: cancelReason },
    });

    await publishEvent(
      'APPOINTMENT_CANCELLED',
      session.barbershopId,
      {
        appointmentId: cancelled.id,
        customerName: cancelled.customer.name,
        customerPhone: cancelled.customer.phone,
        barberName: cancelled.barber.name,
        serviceName: cancelled.service.name,
        cancelReason,
        cancelledAt: cancelled.cancelledAt?.toISOString(),
      },
      {
        customerId: cancelled.customerId,
        appointmentId: cancelled.id,
        barberId: cancelled.barberId,
        serviceId: cancelled.serviceId,
      }
    );

    return NextResponse.json({ success: true, appointment: cancelled });
  } catch (error: any) {
    console.error('Error cancelling appointment:', error);
    return NextResponse.json({ error: 'Erro ao cancelar agendamento' }, { status: 500 });
  }
}
