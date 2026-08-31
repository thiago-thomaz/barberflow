import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ACADEMIA_CONTENTS, ACADEMIA_CATEGORIES } from '@/lib/academia/content';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search')?.toLowerCase();
    const level = searchParams.get('level');
    const format = searchParams.get('format');
    const favoritesOnly = searchParams.get('favorites') === 'true';

    // Retrieve user progress and favorites if authenticated
    let completedIds = new Set<string>();
    let favoriteIds = new Set<string>();

    if (session?.userId) {
      const [progressList, favoritesList] = await Promise.all([
        prisma.educationProgress.findMany({
          where: { userId: session.userId, isCompleted: true },
          select: { contentId: true },
        }),
        prisma.educationFavorite.findMany({
          where: { userId: session.userId },
          select: { contentId: true },
        }),
      ]);

      progressList.forEach((p) => completedIds.add(p.contentId));
      favoritesList.forEach((f) => favoriteIds.add(f.contentId));
    }

    let filtered = ACADEMIA_CONTENTS.map((item) => ({
      ...item,
      isCompleted: completedIds.has(item.id),
      isFavorite: favoriteIds.has(item.id),
    }));

    if (category && category !== 'TODOS') {
      filtered = filtered.filter((item) => item.category === category);
    }

    if (level && level !== 'TODOS') {
      filtered = filtered.filter((item) => item.level === level);
    }

    if (format && format !== 'TODOS') {
      filtered = filtered.filter((item) => item.format === format);
    }

    if (favoritesOnly) {
      filtered = filtered.filter((item) => item.isFavorite);
    }

    if (search) {
      filtered = filtered.filter(
        (item) =>
          item.title.toLowerCase().includes(search) ||
          item.description.toLowerCase().includes(search) ||
          item.institution.toLowerCase().includes(search) ||
          item.tags.some((tag) => tag.toLowerCase().includes(search))
      );
    }

    const totalCount = ACADEMIA_CONTENTS.length;
    const completedCount = completedIds.size;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // Track Comece Aqui track progress separately
    const comeceAquiItems = ACADEMIA_CONTENTS.filter((i) => i.category === 'COMECE_AQUI');
    const comeceAquiCompleted = comeceAquiItems.filter((i) => completedIds.has(i.id)).length;
    const comeceAquiPercent = comeceAquiItems.length > 0 ? Math.round((comeceAquiCompleted / comeceAquiItems.length) * 100) : 0;

    return NextResponse.json({
      success: true,
      categories: ACADEMIA_CATEGORIES,
      contents: filtered,
      stats: {
        totalContents: totalCount,
        completedCount,
        progressPercent,
        comeceAquiCompleted,
        comeceAquiTotal: comeceAquiItems.length,
        comeceAquiPercent,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao carregar conteúdos da Academia' },
      { status: 500 }
    );
  }
}
