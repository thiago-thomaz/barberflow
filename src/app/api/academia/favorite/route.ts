import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.userId || !session.barbershopId) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const { contentId, isFavorite } = await req.json();
    if (!contentId) {
      return NextResponse.json({ success: false, error: 'contentId é obrigatório' }, { status: 400 });
    }

    if (isFavorite === false) {
      await prisma.educationFavorite.deleteMany({
        where: {
          userId: session.userId,
          contentId,
        },
      });
      return NextResponse.json({ success: true, isFavorite: false });
    }

    const favorite = await prisma.educationFavorite.upsert({
      where: {
        userId_contentId: {
          userId: session.userId,
          contentId,
        },
      },
      update: {
        createdAt: new Date(),
      },
      create: {
        userId: session.userId,
        barbershopId: session.barbershopId,
        contentId,
      },
    });

    return NextResponse.json({ success: true, favorite, isFavorite: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao favoritar conteúdo' },
      { status: 500 }
    );
  }
}
