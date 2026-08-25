import { prisma } from './prisma';

export type FeatureKey =
  | 'WHATSAPP_AUTOMATION'
  | 'ADVANCED_ANALYTICS'
  | 'MULTI_UNIT'
  | 'QR_CODE_DESK'
  | 'CUSTOM_SMS'
  | 'UNLIMITED_BARBERS';

export interface SubscriptionInfo {
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';
  planTier: 'STARTER' | 'PRO' | 'BUSINESS';
  planName: string;
  isTrial: boolean;
  trialDaysRemaining: number;
  currentPeriodEnd: Date;
  canOperate: boolean;
  limits: {
    maxBarbers: number;
    maxMonthlyAppointments: number;
  };
}

/**
 * Resolves current subscription status for a tenant
 */
export async function getTenantSubscription(barbershopId: string): Promise<SubscriptionInfo> {
  let sub = await prisma.subscription.findUnique({
    where: { barbershopId },
    include: { plan: true },
  });

  const now = new Date();

  // If no subscription exists yet, create default 14-day trial for PRO plan
  if (!sub) {
    let proPlan = await prisma.plan.findUnique({ where: { tier: 'PRO' } });
    if (!proPlan) {
      proPlan = await prisma.plan.create({
        data: {
          name: 'Profissional',
          tier: 'PRO',
          price: 119.0,
          maxBarbers: 10,
          maxMonthlyAppointments: 1000,
          hasWhatsappAutomation: true,
          hasAdvancedAnalytics: true,
        },
      });
    }

    const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    sub = await prisma.subscription.create({
      data: {
        barbershopId,
        planId: proPlan.id,
        status: 'TRIALING',
        trialEndsAt: trialEnd,
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
      },
      include: { plan: true },
    });
  }

  const isTrial = sub.status === 'TRIALING';
  let trialDaysRemaining = 0;

  if (isTrial && sub.trialEndsAt) {
    const diff = sub.trialEndsAt.getTime() - now.getTime();
    trialDaysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    if (trialDaysRemaining === 0 && sub.status === 'TRIALING') {
      // Auto transition to expired
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { status: 'EXPIRED' },
      });
      sub.status = 'EXPIRED';
    }
  }

  const canOperate = sub.status === 'ACTIVE' || sub.status === 'TRIALING';

  return {
    status: sub.status as any,
    planTier: (sub.plan?.tier as any) || 'PRO',
    planName: sub.plan?.name || 'Profissional',
    isTrial,
    trialDaysRemaining,
    currentPeriodEnd: sub.currentPeriodEnd,
    canOperate,
    limits: {
      maxBarbers: sub.plan?.maxBarbers || 10,
      maxMonthlyAppointments: sub.plan?.maxMonthlyAppointments || 1000,
    },
  };
}

/**
 * Checks whether a feature is permitted for the tenant's current plan
 */
export async function canUseFeature(
  barbershopId: string,
  feature: FeatureKey
): Promise<{ allowed: boolean; reason?: string }> {
  const sub = await getTenantSubscription(barbershopId);

  if (!sub.canOperate) {
    return {
      allowed: false,
      reason: 'Sua assinatura expirou. Atualize seu plano para continuar utilizando este recurso.',
    };
  }

  // During Trial or PRO / BUSINESS plan, all premium features are unlocked
  if (sub.isTrial || sub.planTier === 'PRO' || sub.planTier === 'BUSINESS') {
    return { allowed: true };
  }

  // Starter limitations
  if (sub.planTier === 'STARTER') {
    if (feature === 'WHATSAPP_AUTOMATION') {
      return {
        allowed: false,
        reason: 'Automações via WhatsApp estão disponíveis nos planos Profissional e Business.',
      };
    }
    if (feature === 'MULTI_UNIT') {
      return {
        allowed: false,
        reason: 'Múltiplas unidades estão disponíveis no plano Business.',
      };
    }
  }

  return { allowed: true };
}

/**
 * Checks if tenant has reached barber quota limit
 */
export async function checkBarberLimit(
  barbershopId: string
): Promise<{ allowed: boolean; current: number; max: number; reason?: string }> {
  const sub = await getTenantSubscription(barbershopId);
  const count = await prisma.barber.count({
    where: { barbershopId, deletedAt: null, isActive: true },
  });

  if (count >= sub.limits.maxBarbers) {
    return {
      allowed: false,
      current: count,
      max: sub.limits.maxBarbers,
      reason: `Limite de ${sub.limits.maxBarbers} barbeiros atingido para o plano ${sub.planName}. Faça upgrade para adicionar mais profissionais.`,
    };
  }

  return {
    allowed: true,
    current: count,
    max: sub.limits.maxBarbers,
  };
}
