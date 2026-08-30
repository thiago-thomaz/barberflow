import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ensureDefaultFinancialEntities } from '@/lib/financial';

export const dynamic = 'force-dynamic';

// GET /api/financial-management/transactions - List & filter transactions
export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // INCOME, EXPENSE, TRANSFER
    const status = searchParams.get('status'); // PENDENTE, CONFIRMADO, PAGO, RECEBIDO, CANCELADO, ESTORNADO
    const categoryId = searchParams.get('categoryId');
    const accountId = searchParams.get('accountId');
    const supplierId = searchParams.get('supplierId');
    const customerId = searchParams.get('customerId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: any = {
      barbershopId: session.barbershopId,
    };

    if (type) where.type = type;
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (accountId) where.accountId = accountId;
    if (supplierId) where.supplierId = supplierId;
    if (customerId) where.customerId = customerId;

    if (startDate || endDate) {
      where.OR = [
        {
          paidDate: {
            ...(startDate && { gte: new Date(`${startDate}T00:00:00-03:00`) }),
            ...(endDate && { lte: new Date(`${endDate}T23:59:59.999-03:00`) }),
          },
        },
        {
          dueDate: {
            ...(startDate && { gte: new Date(`${startDate}T00:00:00-03:00`) }),
            ...(endDate && { lte: new Date(`${endDate}T23:59:59.999-03:00`) }),
          },
        },
      ];
    }

    if (search) {
      where.description = { contains: search };
    }

    const [total, transactions] = await Promise.all([
      prisma.financialTransaction.count({ where }),
      prisma.financialTransaction.findMany({
        where,
        include: {
          category: true,
          account: true,
          toAccount: true,
          supplier: true,
          customer: { select: { id: true, name: true, phone: true } },
          appointment: { select: { id: true, scheduledAt: true, serviceNameSnapshot: true } },
        },
        orderBy: [
          { paidDate: 'desc' },
          { dueDate: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Transactions List API Error:', error);
    return NextResponse.json({ error: 'Erro ao listar transações financeiras' }, { status: 500 });
  }
}

// POST /api/financial-management/transactions - Create Income, Expense or Transfer
export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const {
      description,
      type, // 'INCOME' | 'EXPENSE' | 'TRANSFER'
      amount,
      feeAmount = 0.0,
      categoryId,
      accountId,
      toAccountId,
      supplierId,
      customerId,
      status = 'CONFIRMADO', // 'PENDENTE', 'CONFIRMADO', 'PAGO', 'RECEBIDO'
      dueDate,
      paidDate,
      paymentMethod,
      isRecurring = false,
      notes,
    } = body;

    if (!description || !type || amount === undefined || Number(amount) <= 0) {
      return NextResponse.json(
        { error: 'Descrição, tipo e valor positivo são obrigatórios.' },
        { status: 400 }
      );
    }

    if (type === 'TRANSFER') {
      if (!accountId || !toAccountId || accountId === toAccountId) {
        return NextResponse.json(
          { error: 'Para transferência, selecione a conta de origem e conta de destino distintas.' },
          { status: 400 }
        );
      }
    }

    const numAmount = parseFloat(amount);
    const numFee = parseFloat(feeAmount || 0);
    const netAmount = Math.max(0, numAmount - numFee);

    const { defaultAccount } = await ensureDefaultFinancialEntities(session.barbershopId);
    const selectedAccountId = accountId || defaultAccount?.id;

    const parsedDueDate = dueDate ? new Date(`${dueDate}T12:00:00-03:00`) : null;
    const parsedPaidDate =
      status === 'PAGO' || status === 'RECEBIDO' || status === 'CONFIRMADO'
        ? (paidDate ? new Date(`${paidDate}T12:00:00-03:00`) : new Date())
        : null;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Transaction
      const transaction = await tx.financialTransaction.create({
        data: {
          barbershopId: session.barbershopId!,
          description,
          type,
          amount: numAmount,
          feeAmount: numFee,
          netAmount,
          categoryId: categoryId || null,
          accountId: selectedAccountId || null,
          toAccountId: toAccountId || null,
          supplierId: supplierId || null,
          customerId: customerId || null,
          status,
          dueDate: parsedDueDate,
          paidDate: parsedPaidDate,
          paymentMethod: paymentMethod || 'OUTRO',
          isRecurring: !!isRecurring,
          createdBy: session.userId,
          notes: notes || null,
        },
        include: {
          category: true,
          account: true,
          toAccount: true,
          supplier: true,
        },
      });

      // 2. Adjust Balances if effectively realized
      if (status === 'PAGO' || status === 'RECEBIDO' || status === 'CONFIRMADO') {
        if (type === 'INCOME' && selectedAccountId) {
          await tx.financialAccount.update({
            where: { id: selectedAccountId },
            data: { currentBalance: { increment: netAmount } },
          });
        } else if (type === 'EXPENSE' && selectedAccountId) {
          await tx.financialAccount.update({
            where: { id: selectedAccountId },
            data: { currentBalance: { decrement: numAmount } },
          });
        } else if (type === 'TRANSFER' && selectedAccountId && toAccountId) {
          // Source Account decremented
          await tx.financialAccount.update({
            where: { id: selectedAccountId },
            data: { currentBalance: { decrement: numAmount } },
          });
          // Destination Account incremented
          await tx.financialAccount.update({
            where: { id: toAccountId },
            data: { currentBalance: { increment: netAmount } },
          });
        }
      }

      return transaction;
    });

    return NextResponse.json({ success: true, transaction: result });
  } catch (error: any) {
    console.error('Create Transaction API Error:', error);
    return NextResponse.json({ error: 'Erro ao registrar movimentação financeira' }, { status: 500 });
  }
}
