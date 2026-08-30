import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/tenant';
import { publishEvent } from '@/lib/events';
import { calculateCustomerRecurrence } from '@/lib/recurrence';
import { syncPaymentToFinancialTransaction } from '@/lib/financial';

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
      let paymentRecord = appointment.payment;
      if (!paymentRecord) {
        paymentRecord = await tx.payment.create({
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

      return { updatedApp, paymentRecord };
    });

    // 1. Sync idempotently to Financial Management
    if (completed.paymentRecord) {
      await syncPaymentToFinancialTransaction({
        paymentId: completed.paymentRecord.id,
        barbershopId: session.barbershopId,
        amount: completed.paymentRecord.amount,
        method: completed.paymentRecord.method,
        customerId: completed.updatedApp.customerId,
        appointmentId: completed.updatedApp.id,
        serviceName: completed.updatedApp.service?.name,
        paidAt: completed.paymentRecord.paidAt || new Date(),
      }).catch((err) => console.warn('Failed to sync financial transaction:', err));
    }

    // 2. Track Money on the Table Recovery if customer had pending opportunity
    const pendingRecovery = await prisma.moneyOnTheTableRecovery.findFirst({
      where: {
        barbershopId: session.barbershopId,
        customerId: completed.updatedApp.customerId,
        status: 'PENDING',
      },
    });

    if (pendingRecovery) {
      await prisma.moneyOnTheTableRecovery.update({
        where: { id: pendingRecovery.id },
        data: {
          status: 'RECOVERED',
          appointmentId: completed.updatedApp.id,
          recoveredAmount: finalPrice,
          recoveredAt: new Date(),
        },
      }).catch((err) => console.warn('Failed to mark opportunity as recovered:', err));
    }

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
        appointmentId: completed.updatedApp.id,
        customerName: completed.updatedApp.customer.name,
        customerPhone: completed.updatedApp.customer.phone,
        barberName: completed.updatedApp.barber.name,
        serviceName: completed.updatedApp.service.name,
        price: completed.updatedApp.price,
        paymentMethod,
        completedAt: completed.updatedApp.completedAt?.toISOString(),
      },
      {
        customerId: completed.updatedApp.customerId,
        appointmentId: completed.updatedApp.id,
        barberId: completed.updatedApp.barberId,
        serviceId: completed.updatedApp.serviceId,
      }
    );

    // Recalculate recurrence stats for the customer automatically
    await calculateCustomerRecurrence(completed.updatedApp.customerId, session.barbershopId).catch((err) =>
      console.warn('Failed to calculateCustomerRecurrence:', err)
    );

    return NextResponse.json({ success: true, appointment: completed.updatedApp });
  } catch (error: any) {
    console.error('Error completing appointment:', error);
    return NextResponse.json({ error: 'Erro ao concluir atendimento' }, { status: 500 });
  }
}
