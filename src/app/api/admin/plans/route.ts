import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, logAdminAuditEvent } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin(req);

    const plans = await prisma.plan.findMany({
      orderBy: { price: 'asc' },
      include: {
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: plans,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Acesso restrito ao Super Admin' }, { status: 403 });
    }
    console.error('[AdminPlans GET API Error]:', error);
    return NextResponse.json({ error: 'Erro ao listar planos' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user: adminUser } = await requireSuperAdmin(req);
    const body = await req.json();

    const {
      name,
      tier,
      price,
      interval = 'MONTHLY',
      maxBarbers = 2,
      maxMonthlyAppointments = 200,
      hasWhatsappAutomation = false,
      hasAdvancedAnalytics = false,
      hasMultiUnit = false,
      featuresJson,
    } = body;

    if (!name || !tier || price === undefined) {
      return NextResponse.json(
        { error: 'Nome, Identificador (Tier) e Preço são obrigatórios' },
        { status: 400 }
      );
    }

    const normalizedTier = tier.toUpperCase().trim();

    const existingPlan = await prisma.plan.findUnique({
      where: { tier: normalizedTier },
    });

    if (existingPlan) {
      return NextResponse.json(
        { error: `Já existe um plano com o identificador ${normalizedTier}` },
        { status: 400 }
      );
    }

    const newPlan = await prisma.plan.create({
      data: {
        name,
        tier: normalizedTier,
        price: parseFloat(price),
        interval,
        maxBarbers: parseInt(maxBarbers),
        maxMonthlyAppointments: parseInt(maxMonthlyAppointments),
        hasWhatsappAutomation: !!hasWhatsappAutomation,
        hasAdvancedAnalytics: !!hasAdvancedAnalytics,
        hasMultiUnit: !!hasMultiUnit,
        featuresJson: featuresJson ? (typeof featuresJson === 'string' ? featuresJson : JSON.stringify(featuresJson)) : null,
      },
    });

    await logAdminAuditEvent({
      adminUserId: adminUser.id,
      action: 'CREATE_PLAN',
      entity: 'Plan',
      entityId: newPlan.id,
      metadata: { name: newPlan.name, tier: newPlan.tier, price: newPlan.price },
      req,
    });

    return NextResponse.json({
      success: true,
      message: 'Plano criado com sucesso',
      data: newPlan,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Acesso restrito ao Super Admin' }, { status: 403 });
    }
    console.error('[AdminPlans POST API Error]:', error);
    return NextResponse.json({ error: 'Erro ao criar plano' }, { status: 500 });
  }
}
