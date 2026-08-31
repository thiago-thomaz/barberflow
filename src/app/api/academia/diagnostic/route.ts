import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  fetchTenantRealMetrics,
  runDiagnosticEvaluation,
  DiagnosticAnswers,
} from '@/lib/academia/diagnostic-engine';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const barbershopId = session.barbershopId;
    const realMetrics = await fetchTenantRealMetrics(prisma, barbershopId);

    // Busca o diagnóstico mais recente do tenant
    const latestRecord = await prisma.academyDiagnostic.findFirst({
      where: { barbershopId },
      orderBy: { createdAt: 'desc' },
    });

    let savedAnswers: DiagnosticAnswers | undefined;
    if (latestRecord && latestRecord.answersJson) {
      try {
        savedAnswers = JSON.parse(latestRecord.answersJson);
      } catch {
        savedAnswers = undefined;
      }
    }

    // Executa a avaliação com fusão de dados
    const evaluation = runDiagnosticEvaluation(savedAnswers, realMetrics);

    return NextResponse.json({
      success: true,
      diagnostic: evaluation,
      latestRecord: latestRecord
        ? {
            id: latestRecord.id,
            healthScore: latestRecord.healthScore,
            healthCategory: latestRecord.healthCategory,
            biggestProblem: latestRecord.biggestProblem,
            createdAt: latestRecord.createdAt,
            updatedAt: latestRecord.updatedAt,
          }
        : null,
      realMetrics,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao carregar diagnóstico' },
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
    const answers: DiagnosticAnswers = body.answers || {};

    const realMetrics = await fetchTenantRealMetrics(prisma, barbershopId);
    const result = runDiagnosticEvaluation(answers, realMetrics);

    // 1. Persiste o diagnóstico do tenant
    const diagnosticRecord = await prisma.academyDiagnostic.create({
      data: {
        barbershopId,
        userId,
        answersJson: JSON.stringify(answers),
        realMetricsJson: JSON.stringify(result.effectiveMetrics),
        healthScore: result.healthScore,
        healthCategory: result.healthCategory,
        prioritiesJson: JSON.stringify(result.priorities),
        biggestProblem: result.biggestProblemIdentified,
        missingDataJson: result.missingData ? JSON.stringify(result.missingData) : null,
        status: 'COMPLETED',
      },
    });

    // 2. Persiste os itens do plano de ação gerados
    if (result.actionPlans && result.actionPlans.length > 0) {
      for (const plan of result.actionPlans) {
        // Verifica se já existe um plano idêntico pendente para não duplicar
        const existing = await prisma.academyActionPlan.findFirst({
          where: {
            barbershopId,
            problem: plan.problem,
            status: { in: ['PENDENTE', 'EM_ANDAMENTO'] },
          },
        });

        if (!existing) {
          const targetDeadline = new Date(Date.now() + plan.deadlineDays * 24 * 60 * 60 * 1000);
          await prisma.academyActionPlan.create({
            data: {
              barbershopId,
              userId,
              diagnosticId: diagnosticRecord.id,
              title: plan.title,
              problem: plan.problem,
              whyItMatters: plan.whyItMatters,
              action: plan.action,
              howTo: plan.howTo,
              deadlineDays: plan.deadlineDays,
              targetDeadline,
              indicator: plan.indicator,
              recommendedCategory: plan.recommendedCategory,
              recommendedContentIds: JSON.stringify(plan.recommendedContentIds),
              recommendedToolId: plan.recommendedToolId || null,
              recommendedChecklistId: plan.recommendedChecklistId || null,
              status: 'PENDENTE',
            },
          });
        }
      }
    }

    // 3. Salva snapshot histórico de evolução
    await prisma.academyDiagnosticSnapshot.create({
      data: {
        barbershopId,
        score: result.healthScore,
        category: result.healthCategory,
        metricsJson: JSON.stringify(result.effectiveMetrics),
      },
    });

    return NextResponse.json({
      success: true,
      diagnostic: result,
      diagnosticId: diagnosticRecord.id,
      realMetrics,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao processar diagnóstico' },
      { status: 500 }
    );
  }
}
