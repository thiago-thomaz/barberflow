import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureDefaultFinancialEntities } from '@/lib/financial';

export const dynamic = 'force-dynamic';

// GET /api/financial-management/categories
export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    await ensureDefaultFinancialEntities(session.barbershopId);

    const categories = await prisma.financialCategory.findMany({
      where: { barbershopId: session.barbershopId },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ categories });
  } catch (error: any) {
    console.error('Categories API Error:', error);
    return NextResponse.json({ error: 'Erro ao listar categorias' }, { status: 500 });
  }
}

// POST /api/financial-management/categories
export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { name, type = 'EXPENSE', color = '#f59e0b' } = body;

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: 'Nome da categoria é obrigatório.' }, { status: 400 });
    }

    const category = await prisma.financialCategory.create({
      data: {
        barbershopId: session.barbershopId,
        name: name.trim(),
        type,
        color,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, category });
  } catch (error: any) {
    console.error('Create Category API Error:', error);
    return NextResponse.json({ error: 'Erro ao criar categoria' }, { status: 500 });
  }
}
