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

    const plan = await prisma.plan.findUnique({
      where: { id: params.id },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 });
    }

    const {
      name,
      price,
      interval,
      maxBarbers,
      maxMonthlyAppointments,
      hasWhatsappAutomation,
      hasAdvancedAnalytics,
      hasMultiUnit,
      featuresJson,
    } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (interval !== undefined) updateData.interval = interval;
    if (maxBarbers !== undefined) updateData.maxBarbers = parseInt(maxBarbers);
    if (maxMonthlyAppointments !== undefined) updateData.maxMonthlyAppointments = parseInt(maxMonthlyAppointments);
    if (hasWhatsappAutomation !== undefined) updateData.hasWhatsappAutomation = !!hasWhatsappAutomation;
    if (hasAdvancedAnalytics !== undefined) updateData.hasAdvancedAnalytics = !!hasAdvancedAnalytics;
    if (hasMultiUnit !== undefined) updateData.hasMultiUnit = !!hasMultiUnit;
    if (featuresJson !== undefined) {
      updateData.featuresJson = typeof featuresJson === 'string' ? featuresJson : JSON.stringify(featuresJson);
    }

    const updatedPlan = await prisma.plan.update({
      where: { id: params.id },
      data: updateData,
    });

    await logAdminAuditEvent({
      adminUserId: adminUser.id,
      action: 'UPDATE_PLAN',
      entity: 'Plan',
      entityId: params.id,
      metadata: { previous: plan, updated: updateData },
      req,
    });

    return NextResponse.json({
      success: true,
      message: 'Plano atualizado com sucesso',
      data: updatedPlan,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Acesso restrito ao Super Admin' }, { status: 403 });
    }
    console.error('[AdminPlanUpdate API Error]:', error);
    return NextResponse.json({ error: 'Erro ao atualizar plano' }, { status: 500 });
  }
}
