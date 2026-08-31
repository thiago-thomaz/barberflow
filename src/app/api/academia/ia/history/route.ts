import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId || !session.userId) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const history = await prisma.educationAiConsultation.findMany({
      where: {
        barbershopId: session.barbershopId,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const formatted = history.map((item) => ({
      id: item.id,
      question: item.question,
      topic: item.topic,
      diagnosis: item.diagnosis,
      recommendation: item.recommendation,
      actionPlan: item.actionPlanJson ? JSON.parse(item.actionPlanJson) : [],
      metric: item.metric,
      disclaimer: item.disclaimer,
      modelUsed: item.modelUsed,
      createdAt: item.createdAt,
    }));

    return NextResponse.json({
      success: true,
      history: formatted,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao buscar histórico de consultas' },
      { status: 500 }
    );
  }
}
