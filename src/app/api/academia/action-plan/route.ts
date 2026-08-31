import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ACADEMIA_CONTENTS } from '@/lib/academia/content';
import { ACADEMIA_CALCULATORS, ACADEMIA_CHECKLISTS } from '@/lib/academia/tools';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const barbershopId = session.barbershopId;
    const url = new URL(req.url);
    const statusParam = url.searchParams.get('status');

    const whereClause: any = { barbershopId };
    if (statusParam && ['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO'].includes(statusParam)) {
      whereClause.status = statusParam;
    }

    const plans = await prisma.academyActionPlan.findMany({
      where: whereClause,
      orderBy: [{ createdAt: 'desc' }],
    });

    const enrichedPlans = plans.map((plan) => {
      let contentIds: string[] = [];
      if (plan.recommendedContentIds) {
        try {
          contentIds = JSON.parse(plan.recommendedContentIds);
        } catch {
          contentIds = [];
        }
      }

      const contents = ACADEMIA_CONTENTS.filter((c) => contentIds.includes(c.id));
      const tool = plan.recommendedToolId
        ? ACADEMIA_CALCULATORS.find((t) => t.id === plan.recommendedToolId)
        : null;
      const checklist = plan.recommendedChecklistId
        ? ACADEMIA_CHECKLISTS.find((c) => c.id === plan.recommendedChecklistId)
        : null;

      return {
        ...plan,
        resolvedContents: contents,
        resolvedTool: tool ? { id: tool.id, name: tool.name, category: tool.category } : null,
        resolvedChecklist: checklist
          ? { id: checklist.id, name: checklist.name, frequency: checklist.frequency }
          : null,
      };
    });

    const allTenantPlans = await prisma.academyActionPlan.findMany({
      where: { barbershopId },
      select: { status: true },
    });

    const stats = {
      total: allTenantPlans.length,
      pending: allTenantPlans.filter((p) => p.status === 'PENDENTE').length,
      inProgress: allTenantPlans.filter((p) => p.status === 'EM_ANDAMENTO').length,
      completed: allTenantPlans.filter((p) => p.status === 'CONCLUIDO').length,
    };

    return NextResponse.json({
      success: true,
      actionPlans: enrichedPlans,
      stats,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao carregar plano de ação' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId || !session.userId) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const barbershopId = session.barbershopId;
    const userId = session.userId;
    const body = await req.json().catch(() => ({}));

    if (!body.title || !body.problem || !body.action) {
      return NextResponse.json(
        { success: false, error: 'Título, problema e ação são obrigatórios' },
        { status: 400 }
      );
    }

    const deadlineDays = Number(body.deadlineDays) || 7;
    const targetDeadline = new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000);

    const newPlan = await prisma.academyActionPlan.create({
      data: {
        barbershopId,
        userId,
        title: body.title.trim(),
        problem: body.problem.trim(),
        whyItMatters: (body.whyItMatters || '').trim(),
        action: body.action.trim(),
        howTo: (body.howTo || '').trim(),
        deadlineDays,
        targetDeadline,
        indicator: (body.indicator || '').trim(),
        recommendedCategory: body.recommendedCategory || 'GESTAO',
        recommendedContentIds: body.recommendedContentIds ? JSON.stringify(body.recommendedContentIds) : null,
        recommendedToolId: body.recommendedToolId || null,
        recommendedChecklistId: body.recommendedChecklistId || null,
        status: body.status === 'EM_ANDAMENTO' ? 'EM_ANDAMENTO' : 'PENDENTE',
      },
    });

    return NextResponse.json({
      success: true,
      actionPlan: newPlan,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao criar item do plano de ação' },
      { status: 500 }
    );
  }
}
