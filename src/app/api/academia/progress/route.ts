import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.userId || !session.barbershopId) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const { contentId, isCompleted } = await req.json();
    if (!contentId) {
      return NextResponse.json({ success: false, error: 'contentId é obrigatório' }, { status: 400 });
    }

    if (isCompleted === false) {
      await prisma.educationProgress.deleteMany({
        where: {
          userId: session.userId,
          contentId,
        },
      });
      return NextResponse.json({ success: true, isCompleted: false });
    }

    const progress = await prisma.educationProgress.upsert({
      where: {
        userId_contentId: {
          userId: session.userId,
          contentId,
        },
      },
      update: {
        isCompleted: true,
        completedAt: new Date(),
      },
      create: {
        userId: session.userId,
        barbershopId: session.barbershopId,
        contentId,
        isCompleted: true,
      },
    });

    return NextResponse.json({ success: true, progress, isCompleted: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao atualizar progresso' },
      { status: 500 }
    );
  }
}
