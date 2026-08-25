import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/public/[slug] - Public details of the barbershop
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const shop = await prisma.barbershop.findUnique({
      where: { slug: params.slug },
      select: {
        id: true,
        name: true,
        slug: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        logoUrl: true,
        businessHours: {
          orderBy: { dayOfWeek: 'asc' },
        },
        services: {
          where: { isActive: true, deletedAt: null },
          orderBy: { price: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            durationMin: true,
          },
        },
        barbers: {
          where: { isActive: true, deletedAt: null },
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            specialty: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!shop) {
      return NextResponse.json({ error: 'Barbearia não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ shop });
  } catch (error: any) {
    console.error('Error fetching public shop details:', error);
    return NextResponse.json({ error: 'Erro ao carregar barbearia' }, { status: 500 });
  }
}
