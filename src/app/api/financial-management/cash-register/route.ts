import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureDefaultFinancialEntities } from '@/lib/financial';

export const dynamic = 'force-dynamic';

// GET /api/financial-management/cash-register - Current Open Register and History
export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { defaultAccount } = await ensureDefaultFinancialEntities(session.barbershopId);

    // 1. Find currently OPEN cash register
    const openRegister = await prisma.cashRegister.findFirst({
      where: { barbershopId: session.barbershopId, status: 'OPEN' },
      include: {
        account: true,
        transactions: {
          include: { category: true, customer: true, supplier: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    let currentExpected = 0;
    if (openRegister) {
      const incomes = openRegister.transactions
        .filter((t) => t.type === 'INCOME' && t.status !== 'CANCELADO' && t.status !== 'ESTORNADO')
        .reduce((acc, t) => acc + t.amount, 0);

      const expenses = openRegister.transactions
        .filter((t) => t.type === 'EXPENSE' && t.status !== 'CANCELADO' && t.status !== 'ESTORNADO')
        .reduce((acc, t) => acc + t.amount, 0);

      currentExpected = openRegister.initialBalance + incomes - expenses;
    }

    // 2. Recent closed registers history
    const history = await prisma.cashRegister.findMany({
      where: { barbershopId: session.barbershopId, status: 'CLOSED' },
      include: { account: true },
      orderBy: { closedAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      openRegister: openRegister
        ? {
            ...openRegister,
            currentExpected,
          }
        : null,
      history,
      defaultAccount,
    });
  } catch (error: any) {
    console.error('Cash Register API Error:', error);
    return NextResponse.json({ error: 'Erro ao consultar caixa diário' }, { status: 500 });
  }
}

// POST /api/financial-management/cash-register - Open, Close or Record Movement (Sangria / Suprimento)
export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { action, initialBalance = 0.0, actualBalance, accountId, notes, amount, description, type } = body;

    const { defaultAccount } = await ensureDefaultFinancialEntities(session.barbershopId);
    const selectedAccountId = accountId || defaultAccount?.id;

    // ACTION: OPEN CAIXA
    if (action === 'OPEN') {
      const alreadyOpen = await prisma.cashRegister.findFirst({
        where: { barbershopId: session.barbershopId, status: 'OPEN' },
      });

      if (alreadyOpen) {
        return NextResponse.json({ error: 'Já existe um caixa aberto para esta barbearia.' }, { status: 400 });
      }

      const numInitial = parseFloat(initialBalance || 0);

      const register = await prisma.$transaction(async (tx) => {
        const created = await tx.cashRegister.create({
          data: {
            barbershopId: session.barbershopId!,
            accountId: selectedAccountId,
            initialBalance: numInitial,
            expectedBalance: numInitial,
            openedBy: session.userId,
            status: 'OPEN',
            notes: notes || null,
          },
          include: { account: true },
        });

        // Set account balance to initial
        if (numInitial > 0 && selectedAccountId) {
          await tx.financialAccount.update({
            where: { id: selectedAccountId },
            data: { currentBalance: numInitial },
          });
        }

        return created;
      });

      return NextResponse.json({ success: true, register });
    }

    // ACTION: CLOSE CAIXA
    if (action === 'CLOSE') {
      const openRegister = await prisma.cashRegister.findFirst({
        where: { barbershopId: session.barbershopId, status: 'OPEN' },
        include: {
          transactions: {
            where: { status: { notIn: ['CANCELADO', 'ESTORNADO'] } },
          },
        },
      });

      if (!openRegister) {
        return NextResponse.json({ error: 'Nenhum caixa está aberto no momento.' }, { status: 400 });
      }

      const numActual = parseFloat(actualBalance !== undefined ? actualBalance : 0);
      const totalIncomes = openRegister.transactions
        .filter((t) => t.type === 'INCOME')
        .reduce((acc, t) => acc + t.amount, 0);
      const totalExpenses = openRegister.transactions
        .filter((t) => t.type === 'EXPENSE')
        .reduce((acc, t) => acc + t.amount, 0);

      const expectedBalance = openRegister.initialBalance + totalIncomes - totalExpenses;
      const difference = numActual - expectedBalance; // > 0: sobra, < 0: falta

      const closed = await prisma.cashRegister.update({
        where: { id: openRegister.id },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          closedBy: session.userId,
          expectedBalance,
          actualBalance: numActual,
          difference,
          notes: notes !== undefined ? notes : openRegister.notes,
        },
        include: { account: true },
      });

      return NextResponse.json({
        success: true,
        register: closed,
        summary: {
          initialBalance: openRegister.initialBalance,
          totalIncomes,
          totalExpenses,
          expectedBalance,
          actualBalance: numActual,
          difference,
          hasSobra: difference > 0.01,
          hasFalta: difference < -0.01,
        },
      });
    }

    // ACTION: MOVEMENT (Sangria = Retirada ou Suprimento = Aporte de Troco)
    if (action === 'MOVEMENT' || action === 'SANGRIA' || action === 'SUPRIMENTO') {
      const openRegister = await prisma.cashRegister.findFirst({
        where: { barbershopId: session.barbershopId, status: 'OPEN' },
      });

      if (!openRegister) {
        return NextResponse.json({ error: 'Abra o caixa antes de registrar sangrias ou suprimentos.' }, { status: 400 });
      }

      const isSangria = action === 'SANGRIA' || type === 'SANGRIA' || type === 'EXPENSE';
      const movementType = isSangria ? 'EXPENSE' : 'INCOME';
      const numAmount = parseFloat(amount || 0);

      if (numAmount <= 0) {
        return NextResponse.json({ error: 'Valor da movimentação deve ser maior que zero.' }, { status: 400 });
      }

      const desc = description || (isSangria ? 'Sangria de Caixa (Retirada)' : 'Suprimento de Caixa (Troco)');

      const result = await prisma.$transaction(async (tx) => {
        const trans = await tx.financialTransaction.create({
          data: {
            barbershopId: session.barbershopId!,
            description: desc,
            type: movementType,
            amount: numAmount,
            feeAmount: 0.0,
            netAmount: numAmount,
            accountId: openRegister.accountId,
            cashRegisterId: openRegister.id,
            status: 'CONFIRMADO',
            dueDate: new Date(),
            paidDate: new Date(),
            paymentMethod: 'DINHEIRO',
            createdBy: session.userId,
            notes: notes || null,
          },
        });

        // Update Account balance
        await tx.financialAccount.update({
          where: { id: openRegister.accountId },
          data: {
            currentBalance: {
              [isSangria ? 'decrement' : 'increment']: numAmount,
            },
          },
        });

        return trans;
      });

      return NextResponse.json({ success: true, transaction: result });
    }

    return NextResponse.json({ error: 'Ação inválida. Use OPEN, CLOSE ou MOVEMENT.' }, { status: 400 });
  } catch (error: any) {
    console.error('Cash Register Action API Error:', error);
    return NextResponse.json({ error: 'Erro ao processar operação de caixa' }, { status: 500 });
  }
}
