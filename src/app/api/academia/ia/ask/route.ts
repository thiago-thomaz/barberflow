import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { consultBarberFlowAi } from '@/lib/academia/ai-consultant';

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId || !session.userId) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const { question, metrics } = await req.json();
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Pergunta é obrigatória' }, { status: 400 });
    }

    const advice = await consultBarberFlowAi(
      question,
      metrics,
      session.userId,
      session.barbershopId
    );

    // Save consultation record to database
    try {
      await prisma.educationAiConsultation.create({
        data: {
          userId: session.userId,
          barbershopId: session.barbershopId,
          question: question.trim(),
          topic: advice.topic,
          diagnosis: advice.diagnosis,
          recommendation: advice.recommendation,
          actionPlanJson: JSON.stringify(advice.actionPlan),
          metric: advice.metric,
          disclaimer: advice.disclaimer || null,
          responseTimeMs: advice.responseTimeMs,
          modelUsed: advice.modelUsed,
        },
      });
    } catch (saveErr) {
      console.warn('[Academia AI] Could not persist consultation history:', saveErr);
    }

    return NextResponse.json({
      success: true,
      consultation: advice,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao processar consulta de IA' },
      { status: 500 }
    );
  }
}
