import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { reverseFinancialTransaction } from '@/lib/financial';

export const dynamic = 'force-dynamic';

// GET /api/financial-management/transactions/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const transaction = await prisma.financialTransaction.findFirst({
      where: { id: params.id, barbershopId: session.barbershopId },
      include: {
        category: true,
        account: true,
        toAccount: true,
        supplier: true,
        customer: true,
        appointment: true,
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ transaction });
  } catch (error: any) {
    console.error('Get Transaction API Error:', error);
    return NextResponse.json({ error: 'Erro ao buscar transação' }, { status: 500 });
  }
}

// PATCH /api/financial-management/transactions/[id] - Baixar ou atualizar
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const transaction = await prisma.financialTransaction.findFirst({
      where: { id: params.id, barbershopId: session.barbershopId },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transação não encontrada' }, { status: 404 });
    }

    const body = await req.json();
    const { action, reason, status, paidDate, paymentMethod, notes, accountId } = body;

    // 1. Check if action is Reversal (Estorno)
    if (action === 'REVERSE' || action === 'ESTORNO') {
      const reversed = await reverseFinancialTransaction({
        transactionId: transaction.id,
        barbershopId: session.barbershopId,
        userId: session.userId,
        reason: reason || 'Estorno solicitado pelo usuário',
      });
      return NextResponse.json({ success: true, transaction: reversed });
    }

    // 2. Settlement / Payment execution (Dar baixa em conta a pagar/receber)
    if (status === 'PAGO' || status === 'RECEBIDO') {
      if (transaction.status === 'PAGO' || transaction.status === 'RECEBIDO') {
        return NextResponse.json({ error: 'Esta conta já foi baixada anteriormente.' }, { status: 400 });
      }

      const settlementPaidDate = paidDate ? new Date(`${paidDate}T12:00:00-03:00`) : new Date();
      const settlementAccountId = accountId || transaction.accountId;

      const updated = await prisma.$transaction(async (tx) => {
        const trans = await tx.financialTransaction.update({
          where: { id: transaction.id },
          data: {
            status,
            paidDate: settlementPaidDate,
            paidBy: session.userId,
            paymentMethod: paymentMethod || transaction.paymentMethod,
            accountId: settlementAccountId,
            notes: notes !== undefined ? notes : transaction.notes,
          },
          include: { category: true, account: true, supplier: true, customer: true },
        });

        // Adjust balance
        if (settlementAccountId) {
          if (transaction.type === 'INCOME') {
            await tx.financialAccount.update({
              where: { id: settlementAccountId },
              data: { currentBalance: { increment: transaction.netAmount } },
            });
          } else if (transaction.type === 'EXPENSE') {
            await tx.financialAccount.update({
              where: { id: settlementAccountId },
              data: { currentBalance: { decrement: transaction.amount } },
            });
          }
        }

        return trans;
      });

      return NextResponse.json({ success: true, transaction: updated });
    }

    // 3. Simple field updates
    const updated = await prisma.financialTransaction.update({
      where: { id: transaction.id },
      data: {
        ...(notes !== undefined && { notes }),
        ...(paymentMethod && { paymentMethod }),
      },
    });

    return NextResponse.json({ success: true, transaction: updated });
  } catch (error: any) {
    console.error('Update Transaction API Error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao atualizar transação' }, { status: 500 });
  }
}
