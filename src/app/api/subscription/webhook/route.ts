import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// POST /api/subscription/webhook - Inbound webhook for payment gateway events
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-gateway-signature') || req.headers.get('stripe-signature');
    const secret = process.env.PAYMENT_WEBHOOK_SECRET || 'whsec_payment_default';

    // Verify HMAC if provided
    if (signature) {
      const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      if (signature !== expected) {
        return NextResponse.json({ error: 'Assinatura do webhook inválida' }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);
    const { event, barbershopId, status, targetTier } = payload;

    if (!barbershopId) {
      return NextResponse.json({ error: 'barbershopId é obrigatório' }, { status: 400 });
    }

    // Idempotency: Log event
    const eventRecord = await prisma.subscriptionEvent.create({
      data: {
        barbershopId,
        eventType: event || 'subscription.updated',
        payload: rawBody,
      },
    });

    if (event === 'payment.approved' || event === 'invoice.paid') {
      await prisma.subscription.updateMany({
        where: { barbershopId },
        data: {
          status: 'ACTIVE',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
    } else if (event === 'payment.failed') {
      await prisma.subscription.updateMany({
        where: { barbershopId },
        data: { status: 'PAST_DUE' },
      });
    } else if (event === 'subscription.cancelled') {
      await prisma.subscription.updateMany({
        where: { barbershopId },
        data: { status: 'CANCELLED' },
      });
    }

    return NextResponse.json({ success: true, eventId: eventRecord.id });
  } catch (error: any) {
    console.error('Subscription webhook error:', error);
    return NextResponse.json({ error: 'Erro ao processar webhook de pagamento' }, { status: 500 });
  }
}
