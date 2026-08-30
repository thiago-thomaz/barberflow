import { prisma } from './prisma';
import { getTodayDateStringSP } from './timezone';

export interface EnsureDefaultFinancialEntitiesResult {
  defaultAccount: any;
  serviceCategory: any;
  productCategory: any;
  rentCategory: any;
  utilitiesCategory: any;
  salaryCategory: any;
  commissionCategory: any;
  suppliesCategory: any;
  taxCategory: any;
  otherExpenseCategory: any;
}

/**
 * Ensures default financial accounts and categories exist for a barbershop
 */
export async function ensureDefaultFinancialEntities(barbershopId: string): Promise<EnsureDefaultFinancialEntitiesResult> {
  // 1. Ensure Default Account (Caixa Balcão)
  let defaultAccount = await prisma.financialAccount.findFirst({
    where: { barbershopId, isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!defaultAccount) {
    defaultAccount = await prisma.financialAccount.create({
      data: {
        barbershopId,
        name: 'Caixa Balcão',
        type: 'CASH',
        initialBalance: 0.0,
        currentBalance: 0.0,
        isActive: true,
      },
    });

    // Also create a Bank Account for convenience
    await prisma.financialAccount.create({
      data: {
        barbershopId,
        name: 'Conta Bancária Principal',
        type: 'BANK',
        initialBalance: 0.0,
        currentBalance: 0.0,
        isActive: true,
      },
    });
  }

  // 2. Ensure Default Categories
  const defaultIncomeCategories = [
    { name: 'Serviços', type: 'INCOME', color: '#10b981' },
    { name: 'Produtos', type: 'INCOME', color: '#06b6d4' },
    { name: 'Pacotes & Assinaturas', type: 'INCOME', color: '#8b5cf6' },
    { name: 'Outras Receitas', type: 'INCOME', color: '#3b82f6' },
  ];

  const defaultExpenseCategories = [
    { name: 'Aluguel & Condomínio', type: 'EXPENSE', color: '#ef4444' },
    { name: 'Água / Energia / Internet', type: 'EXPENSE', color: '#f97316' },
    { name: 'Produtos & Insumos', type: 'EXPENSE', color: '#ec4899' },
    { name: 'Limpeza & Manutenção', type: 'EXPENSE', color: '#eab308' },
    { name: 'Marketing & Divulgação', type: 'EXPENSE', color: '#a855f7' },
    { name: 'Salários & Pró-labore', type: 'EXPENSE', color: '#6366f1' },
    { name: 'Comissões de Barbeiros', type: 'EXPENSE', color: '#f43f5e' },
    { name: 'Taxas de Cartão & Gateway', type: 'EXPENSE', color: '#64748b' },
    { name: 'Impostos & Contabilidade', type: 'EXPENSE', color: '#78716c' },
    { name: 'Outras Despesas', type: 'EXPENSE', color: '#71717a' },
  ];

  const categories = await prisma.financialCategory.findMany({
    where: { barbershopId },
  });

  const categoryMap = new Map(categories.map((c) => [`${c.type}:${c.name.toLowerCase()}`, c]));

  for (const cat of [...defaultIncomeCategories, ...defaultExpenseCategories]) {
    const key = `${cat.type}:${cat.name.toLowerCase()}`;
    if (!categoryMap.has(key)) {
      const created = await prisma.financialCategory.create({
        data: {
          barbershopId,
          name: cat.name,
          type: cat.type,
          color: cat.color,
          isActive: true,
        },
      });
      categoryMap.set(key, created);
    }
  }

  return {
    defaultAccount,
    serviceCategory: categoryMap.get('INCOME:serviços'),
    productCategory: categoryMap.get('INCOME:produtos'),
    rentCategory: categoryMap.get('EXPENSE:aluguel & condomínio'),
    utilitiesCategory: categoryMap.get('EXPENSE:água / energia / internet'),
    salaryCategory: categoryMap.get('EXPENSE:salários & pró-labore'),
    commissionCategory: categoryMap.get('EXPENSE:comissões de barbeiros'),
    suppliesCategory: categoryMap.get('EXPENSE:produtos & insumos'),
    taxCategory: categoryMap.get('EXPENSE:impostos & contabilidade'),
    otherExpenseCategory: categoryMap.get('EXPENSE:outras despesas'),
  };
}

/**
 * Idempotently syncs a Payment into a FinancialTransaction income record.
 */
export async function syncPaymentToFinancialTransaction(params: {
  paymentId: string;
  barbershopId: string;
  amount: number;
  method: string;
  customerId?: string | null;
  appointmentId?: string | null;
  serviceName?: string | null;
  paidAt?: Date | null;
  feeAmount?: number;
}) {
  const {
    paymentId,
    barbershopId,
    amount,
    method,
    customerId,
    appointmentId,
    serviceName,
    paidAt = new Date(),
    feeAmount = 0.0,
  } = params;

  // Check if financial transaction already exists for this payment (Idempotency)
  const existing = await prisma.financialTransaction.findUnique({
    where: { paymentId },
  });

  if (existing) {
    return existing;
  }

  const { defaultAccount, serviceCategory } = await ensureDefaultFinancialEntities(barbershopId);

  // Check if there is an open cash register for cash payments
  let cashRegisterId: string | null = null;
  if (method === 'DINHEIRO') {
    const openRegister = await prisma.cashRegister.findFirst({
      where: { barbershopId, status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
    });
    if (openRegister) {
      cashRegisterId = openRegister.id;
    }
  }

  const description = serviceName
    ? `Atendimento: ${serviceName}`
    : 'Recebimento de Atendimento';

  const netAmount = Math.max(0, amount - feeAmount);

  return await prisma.$transaction(async (tx) => {
    const transaction = await tx.financialTransaction.create({
      data: {
        barbershopId,
        description,
        type: 'INCOME',
        amount,
        feeAmount,
        netAmount,
        categoryId: serviceCategory?.id || null,
        accountId: defaultAccount?.id || null,
        customerId: customerId || null,
        appointmentId: appointmentId || null,
        paymentId,
        status: 'CONFIRMADO',
        dueDate: paidAt,
        paidDate: paidAt,
        paymentMethod: method,
        cashRegisterId,
      },
    });

    // Update account balance
    if (defaultAccount?.id) {
      await tx.financialAccount.update({
        where: { id: defaultAccount.id },
        data: { currentBalance: { increment: netAmount } },
      });
    }

    return transaction;
  });
}

/**
 * Reverses (estornos) a financial transaction safely without deleting history.
 */
export async function reverseFinancialTransaction(params: {
  transactionId: string;
  barbershopId: string;
  userId?: string | null;
  reason: string;
}) {
  const { transactionId, barbershopId, userId, reason } = params;

  const original = await prisma.financialTransaction.findFirst({
    where: { id: transactionId, barbershopId },
  });

  if (!original) {
    throw new Error('Transação não encontrada');
  }

  if (original.status === 'ESTORNADO' || original.status === 'CANCELADO') {
    throw new Error('Transação já está cancelada ou estornada');
  }

  return await prisma.$transaction(async (tx) => {
    // 1. Mark original as ESTORNADO
    const updated = await tx.financialTransaction.update({
      where: { id: original.id },
      data: {
        status: 'ESTORNADO',
        reversalReason: reason,
        cancelledBy: userId || null,
        cancelledAt: new Date(),
      },
    });

    // 2. Adjust account balance back
    if (original.accountId) {
      const balanceAdjustment =
        original.type === 'INCOME'
          ? -original.netAmount
          : original.type === 'EXPENSE'
          ? original.netAmount
          : 0;

      if (balanceAdjustment !== 0) {
        await tx.financialAccount.update({
          where: { id: original.accountId },
          data: { currentBalance: { increment: balanceAdjustment } },
        });
      }
    }

    return updated;
  });
}

/**
 * Calculates current Financial Overview KPIs for a Barbershop
 */
export async function getFinancialManagementSummary(barbershopId: string, customStartDate?: Date, customEndDate?: Date) {
  await ensureDefaultFinancialEntities(barbershopId);

  const todayStr = getTodayDateStringSP();
  const startOfToday = new Date(`${todayStr}T00:00:00-03:00`);
  const endOfToday = new Date(`${todayStr}T23:59:59.999-03:00`);

  const now = new Date();
  const startOfMonth = customStartDate || new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const endOfMonth = customEndDate || new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // 1. Total Current Balances across active accounts
  const accounts = await prisma.financialAccount.findMany({
    where: { barbershopId, isActive: true },
  });
  const currentTotalBalance = accounts.reduce((acc, a) => acc + a.currentBalance, 0);

  // 2. Accounts Receivable (A Receber: PENDENTE or ATRASADO income)
  const pendingReceivables = await prisma.financialTransaction.findMany({
    where: {
      barbershopId,
      type: 'INCOME',
      status: { in: ['PENDENTE', 'PARCIAL'] },
    },
  });
  const totalToReceive = pendingReceivables.reduce((acc, t) => acc + t.amount, 0);

  // 3. Accounts Payable (A Pagar: PENDENTE or ATRASADO expense)
  const pendingPayables = await prisma.financialTransaction.findMany({
    where: {
      barbershopId,
      type: 'EXPENSE',
      status: { in: ['PENDENTE', 'PARCIAL'] },
    },
  });
  const totalToPay = pendingPayables.reduce((acc, t) => acc + t.amount, 0);

  // 4. Incomes in selected Period (Entradas do Mês / Período)
  const periodIncomes = await prisma.financialTransaction.findMany({
    where: {
      barbershopId,
      type: 'INCOME',
      status: { in: ['CONFIRMADO', 'RECEBIDO', 'PAGO'] },
      paidDate: { gte: startOfMonth, lte: endOfMonth },
    },
  });
  const totalIncomesMonth = periodIncomes.reduce((acc, t) => acc + t.amount, 0);

  // 5. Expenses in selected Period (Saídas do Mês / Período)
  const periodExpenses = await prisma.financialTransaction.findMany({
    where: {
      barbershopId,
      type: 'EXPENSE',
      status: { in: ['CONFIRMADO', 'PAGO'] },
      paidDate: { gte: startOfMonth, lte: endOfMonth },
    },
  });
  const totalExpensesMonth = periodExpenses.reduce((acc, t) => acc + t.amount, 0);

  // 6. Net Month Result (Resultado do Mês = Entradas - Saídas)
  const monthResult = totalIncomesMonth - totalExpensesMonth;

  // 7. Today's movements
  const todayIncomes = periodIncomes
    .filter((t) => t.paidDate && t.paidDate >= startOfToday && t.paidDate <= endOfToday)
    .reduce((acc, t) => acc + t.amount, 0);

  const todayExpenses = periodExpenses
    .filter((t) => t.paidDate && t.paidDate >= startOfToday && t.paidDate <= endOfToday)
    .reduce((acc, t) => acc + t.amount, 0);

  return {
    currentTotalBalance,
    totalToReceive,
    totalToPay,
    totalIncomesMonth,
    totalExpensesMonth,
    monthResult,
    todayIncomes,
    todayExpenses,
    accounts,
  };
}
