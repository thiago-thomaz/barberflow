import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getTenantSubscription } from '@/lib/feature-gate';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/subscription - Get tenant subscription status, limits, and plan details
export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const subInfo = await getTenantSubscription(session.barbershopId);
    const plans = await prisma.plan.findMany({
      orderBy: { price: 'asc' },
    });

    return NextResponse.json({
      subscription: subInfo,
      availablePlans: plans,
    });
  } catch (error: any) {
    console.error('Subscription API Error:', error);
    return NextResponse.json({ error: 'Erro ao carregar dados da assinatura' }, { status: 500 });
  }
}

// POST /api/subscription - Upgrade or change subscription plan
export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { targetTier } = body; // 'STARTER' | 'PRO' | 'BUSINESS'

    if (!targetTier || !['STARTER', 'PRO', 'BUSINESS'].includes(targetTier)) {
      return NextResponse.json({ error: 'Plano inválido selecionado' }, { status: 400 });
    }

    let plan = await prisma.plan.findUnique({ where: { tier: targetTier } });
    if (!plan) {
      const planPrices = { STARTER: 59.0, PRO: 119.0, BUSINESS: 229.0 };
      const maxBarbersMap = { STARTER: 2, PRO: 10, BUSINESS: 30 };

      plan = await prisma.plan.create({
        data: {
          name: targetTier === 'STARTER' ? 'Starter' : targetTier === 'PRO' ? 'Profissional' : 'Business',
          tier: targetTier,
          price: planPrices[targetTier as keyof typeof planPrices],
          maxBarbers: maxBarbersMap[targetTier as keyof typeof maxBarbersMap],
          hasWhatsappAutomation: targetTier !== 'STARTER',
          hasAdvancedAnalytics: targetTier !== 'STARTER',
          hasMultiUnit: targetTier === 'BUSINESS',
        },
      });
    }

    const now = new Date();
    const nextPeriodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const updated = await prisma.subscription.upsert({
      where: { barbershopId: session.barbershopId },
      update: {
        planId: plan.id,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: nextPeriodEnd,
      },
      create: {
        barbershopId: session.barbershopId,
        planId: plan.id,
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: nextPeriodEnd,
      },
      include: { plan: true },
    });

    return NextResponse.json({
      success: true,
      message: `Plano atualizado com sucesso para ${plan.name}!`,
      subscription: updated,
    });
  } catch (error: any) {
    console.error('Upgrade subscription error:', error);
    return NextResponse.json({ error: 'Erro ao atualizar plano' }, { status: 500 });
  }
}
