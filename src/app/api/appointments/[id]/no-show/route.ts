import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/tenant';
import { publishEvent } from '@/lib/events';

// POST /api/appointments/[id]/no-show - Mark appointment as NO_SHOW and increment customer no-show count
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

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id: params.id },
        data: { status: 'NO_SHOW' },
        include: { customer: true, barber: true, service: true },
      });

      await tx.customer.update({
        where: { id: appointment.customerId },
        data: { noShowCount: { increment: 1 } },
      });

      return updated;
    });

    await logAuditEvent({
      tenantId: session.barbershopId,
      userId: session.userId,
      action: 'NO_SHOW',
      entity: 'Appointment',
      entityId: params.id,
    });

    await publishEvent(
      'APPOINTMENT_NO_SHOW',
      session.barbershopId,
      {
        appointmentId: result.id,
        customerName: result.customer.name,
        customerPhone: result.customer.phone,
        barberName: result.barber.name,
      },
      {
        customerId: result.customerId,
        appointmentId: result.id,
        barberId: result.barberId,
        serviceId: result.serviceId,
      }
    );

    return NextResponse.json({ success: true, appointment: result });
  } catch (error: any) {
    console.error('Error marking no-show:', error);
    return NextResponse.json({ error: 'Erro ao registrar não comparecimento' }, { status: 500 });
  }
}
