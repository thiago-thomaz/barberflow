import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/tenant';
import { publishEvent } from '@/lib/events';
import { calculateCustomerRecurrence } from '@/lib/recurrence';

// POST /api/appointments/[id]/complete - Complete appointment & register payment
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
      include: { customer: true, barber: true, service: true, payment: true },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const paymentMethod = body?.method || 'PIX';
    const finalPrice = body?.amount !== undefined ? parseFloat(body.amount) : appointment.price;

    const completed = await prisma.$transaction(async (tx) => {
      const updatedApp = await tx.appointment.update({
        where: { id: params.id },
        data: {
          status: 'CONCLUIDO',
          completedAt: new Date(),
          price: finalPrice,
        },
        include: { customer: true, barber: true, service: true },
      });

      // Create or update payment record
      if (!appointment.payment) {
        await tx.payment.create({
          data: {
            barbershopId: session.barbershopId!,
            appointmentId: updatedApp.id,
            customerId: updatedApp.customerId,
            barberId: updatedApp.barberId,
            amount: finalPrice,
            method: paymentMethod,
            status: 'PAGO',
            paidAt: new Date(),
          },
        });
      }

      return updatedApp;
    });

    await logAuditEvent({
      tenantId: session.barbershopId,
      userId: session.userId,
      action: 'COMPLETE',
      entity: 'Appointment',
      entityId: params.id,
      metadata: { finalPrice, paymentMethod },
    });

    await publishEvent(
      'APPOINTMENT_COMPLETED',
      session.barbershopId,
      {
        appointmentId: completed.id,
        customerName: completed.customer.name,
        customerPhone: completed.customer.phone,
        barberName: completed.barber.name,
        serviceName: completed.service.name,
        price: completed.price,
        paymentMethod,
        completedAt: completed.completedAt?.toISOString(),
      },
      {
        customerId: completed.customerId,
        appointmentId: completed.id,
        barberId: completed.barberId,
        serviceId: completed.serviceId,
      }
    );

    // Recalculate recurrence stats for the customer automatically
    await calculateCustomerRecurrence(completed.customerId, session.barbershopId).catch((err) =>
      console.warn('Failed to calculateCustomerRecurrence:', err)
    );

    return NextResponse.json({ success: true, appointment: completed });
  } catch (error: any) {
    console.error('Error completing appointment:', error);
    return NextResponse.json({ error: 'Erro ao concluir atendimento' }, { status: 500 });
  }
}
