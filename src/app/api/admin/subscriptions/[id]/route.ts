import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, logAdminAuditEvent } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user: adminUser } = await requireSuperAdmin(req);
    const body = await req.json();

    const subscription = await prisma.subscription.findUnique({
      where: { id: params.id },
      include: { barbershop: true, plan: true },
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Assinatura não encontrada' }, { status: 404 });
    }

    const { status, planId, trialEndsAt, currentPeriodEnd, reason } = body;

    const updateData: any = {};
    if (status) updateData.status = status;
    if (planId) updateData.planId = planId;
    if (trialEndsAt) updateData.trialEndsAt = new Date(trialEndsAt);
    if (currentPeriodEnd) updateData.currentPeriodEnd = new Date(currentPeriodEnd);

    const updatedSub = await prisma.subscription.update({
      where: { id: params.id },
      data: updateData,
      include: { plan: true, barbershop: true },
    });

    await logAdminAuditEvent({
      adminUserId: adminUser.id,
      action: 'CHANGE_SUBSCRIPTION',
      entity: 'Subscription',
      entityId: params.id,
      tenantId: subscription.barbershopId,
      metadata: {
        previous: { status: subscription.status, planId: subscription.planId },
        updated: updateData,
        reason: reason || 'Ajuste administrativo de assinatura',
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: 'Assinatura atualizada com sucesso',
      data: updatedSub,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Acesso restrito ao Super Admin' }, { status: 403 });
    }
    console.error('[AdminSubscriptionUpdate API Error]:', error);
    return NextResponse.json({ error: 'Erro ao atualizar assinatura' }, { status: 500 });
  }
}
