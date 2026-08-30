import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureDefaultFinancialEntities } from '@/lib/financial';

export const dynamic = 'force-dynamic';

// GET /api/financial-management/accounts
export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    await ensureDefaultFinancialEntities(session.barbershopId);

    const accounts = await prisma.financialAccount.findMany({
      where: { barbershopId: session.barbershopId },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ accounts });
  } catch (error: any) {
    console.error('Accounts API Error:', error);
    return NextResponse.json({ error: 'Erro ao listar contas' }, { status: 500 });
  }
}

// POST /api/financial-management/accounts
export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { name, type = 'BANK', initialBalance = 0.0 } = body;

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: 'Nome da conta é obrigatório.' }, { status: 400 });
    }

    const numInitial = parseFloat(initialBalance || 0);

    const account = await prisma.financialAccount.create({
      data: {
        barbershopId: session.barbershopId,
        name: name.trim(),
        type,
        initialBalance: numInitial,
        currentBalance: numInitial,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, account });
  } catch (error: any) {
    console.error('Create Account API Error:', error);
    return NextResponse.json({ error: 'Erro ao criar conta' }, { status: 500 });
  }
}
