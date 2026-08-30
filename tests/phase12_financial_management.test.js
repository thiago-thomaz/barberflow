const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

describe('BarberFlow FASE 12 — Gestão Financeira, Caixa, Idempotência & Dinheiro na Mesa', () => {
  let shopA;
  let shopB;
  let accountA1;
  let accountA2;
  let categoryServicos;
  let categoryDespesas;

  before(async () => {
    shopA = await prisma.barbershop.create({
      data: {
        name: 'Barbearia Fin A',
        slug: `shop-fin-a-${Date.now()}`,
      },
    });

    shopB = await prisma.barbershop.create({
      data: {
        name: 'Barbearia Fin B',
        slug: `shop-fin-b-${Date.now()}`,
      },
    });

    accountA1 = await prisma.financialAccount.create({
      data: {
        barbershopId: shopA.id,
        name: 'Caixa Balcão',
        type: 'CASH',
        initialBalance: 100.0,
        currentBalance: 100.0,
      },
    });

    accountA2 = await prisma.financialAccount.create({
      data: {
        barbershopId: shopA.id,
        name: 'Banco Cora',
        type: 'BANK',
        initialBalance: 500.0,
        currentBalance: 500.0,
      },
    });

    categoryServicos = await prisma.financialCategory.create({
      data: {
        barbershopId: shopA.id,
        name: 'Serviços',
        type: 'INCOME',
        color: '#10b981',
      },
    });

    categoryDespesas = await prisma.financialCategory.create({
      data: {
        barbershopId: shopA.id,
        name: 'Aluguel',
        type: 'EXPENSE',
        color: '#ef4444',
      },
    });
  });

  after(async () => {
    await prisma.financialTransaction.deleteMany({
      where: { barbershopId: { in: [shopA.id, shopB.id] } },
    });
    await prisma.cashRegister.deleteMany({
      where: { barbershopId: { in: [shopA.id, shopB.id] } },
    });
    await prisma.financialCategory.deleteMany({
      where: { barbershopId: { in: [shopA.id, shopB.id] } },
    });
    await prisma.financialAccount.deleteMany({
      where: { barbershopId: { in: [shopA.id, shopB.id] } },
    });
    await prisma.moneyOnTheTableRecovery.deleteMany({
      where: { barbershopId: { in: [shopA.id, shopB.id] } },
    });
    await prisma.barbershop.deleteMany({
      where: { id: { in: [shopA.id, shopB.id] } },
    });
    await prisma.$disconnect();
  });

  test('1. Idempotência estrita em sincronização de Payment', async () => {
    const paymentId = `pay-idemp-${Date.now()}`;

    // 1st insertion
    const t1 = await prisma.financialTransaction.create({
      data: {
        barbershopId: shopA.id,
        description: 'Atendimento: Corte Cabelo',
        type: 'INCOME',
        amount: 45.0,
        feeAmount: 0.0,
        netAmount: 45.0,
        accountId: accountA1.id,
        categoryId: categoryServicos.id,
        paymentId,
        status: 'CONFIRMADO',
        paidDate: new Date(),
      },
    });

    assert.ok(t1.id, 'Transaction created');

    // 2nd insertion with duplicate paymentId should fail unique constraint
    let failedAsExpected = false;
    try {
      await prisma.financialTransaction.create({
        data: {
          barbershopId: shopA.id,
          description: 'Atendimento: Corte Cabelo Duplicado',
          type: 'INCOME',
          amount: 45.0,
          feeAmount: 0.0,
          netAmount: 45.0,
          accountId: accountA1.id,
          categoryId: categoryServicos.id,
          paymentId, // DUPLICATE KEY
          status: 'CONFIRMADO',
          paidDate: new Date(),
        },
      });
    } catch (err) {
      failedAsExpected = true;
    }

    assert.strictEqual(failedAsExpected, true, 'Duplicate paymentId must be rejected by unique constraint');
  });

  test('2. Fluxo de Caixa Realizado (Entradas - Saídas = Saldo)', async () => {
    // Despesa
    await prisma.financialTransaction.create({
      data: {
        barbershopId: shopA.id,
        description: 'Pagamento Aluguel',
        type: 'EXPENSE',
        amount: 20.0,
        feeAmount: 0.0,
        netAmount: 20.0,
        accountId: accountA1.id,
        categoryId: categoryDespesas.id,
        status: 'PAGO',
        paidDate: new Date(),
      },
    });

    const incomes = await prisma.financialTransaction.findMany({
      where: { barbershopId: shopA.id, type: 'INCOME', status: 'CONFIRMADO' },
    });
    const expenses = await prisma.financialTransaction.findMany({
      where: { barbershopId: shopA.id, type: 'EXPENSE', status: 'PAGO' },
    });

    const totalIncomes = incomes.reduce((acc, i) => acc + i.amount, 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const netResult = totalIncomes - totalExpenses;

    assert.strictEqual(totalIncomes, 45.0);
    assert.strictEqual(totalExpenses, 20.0);
    assert.strictEqual(netResult, 25.0);
  });

  test('3. Transferência entre Contas sem afetar Resultado Operacional', async () => {
    const transferAmount = 50.0;

    const transfer = await prisma.financialTransaction.create({
      data: {
        barbershopId: shopA.id,
        description: 'Transferência de Caixa Balcão para Banco Cora',
        type: 'TRANSFER',
        amount: transferAmount,
        netAmount: transferAmount,
        accountId: accountA1.id, // Origem
        toAccountId: accountA2.id, // Destino
        status: 'CONFIRMADO',
        paidDate: new Date(),
      },
    });

    assert.strictEqual(transfer.type, 'TRANSFER');

    // Make sure transfer does NOT count as income or expense
    const operatingIncomes = await prisma.financialTransaction.count({
      where: { barbershopId: shopA.id, type: 'INCOME' },
    });
    const operatingExpenses = await prisma.financialTransaction.count({
      where: { barbershopId: shopA.id, type: 'EXPENSE' },
    });

    assert.strictEqual(operatingIncomes, 1);
    assert.strictEqual(operatingExpenses, 1);
  });

  test('4. Caixa Diário: Abertura, Sangria, Suprimento e Fechamento com Sobra/Falta', async () => {
    // Abrir Caixa
    const caixa = await prisma.cashRegister.create({
      data: {
        barbershopId: shopA.id,
        accountId: accountA1.id,
        initialBalance: 100.0,
        expectedBalance: 100.0,
        status: 'OPEN',
      },
    });

    assert.strictEqual(caixa.status, 'OPEN');

    // Suprimento de R$ 30
    await prisma.financialTransaction.create({
      data: {
        barbershopId: shopA.id,
        description: 'Suprimento de Troco',
        type: 'INCOME',
        amount: 30.0,
        netAmount: 30.0,
        accountId: accountA1.id,
        cashRegisterId: caixa.id,
        status: 'CONFIRMADO',
        paidDate: new Date(),
      },
    });

    // Sangria de R$ 10
    await prisma.financialTransaction.create({
      data: {
        barbershopId: shopA.id,
        description: 'Sangria para compras',
        type: 'EXPENSE',
        amount: 10.0,
        netAmount: 10.0,
        accountId: accountA1.id,
        cashRegisterId: caixa.id,
        status: 'CONFIRMADO',
        paidDate: new Date(),
      },
    });

    const movements = await prisma.financialTransaction.findMany({
      where: { cashRegisterId: caixa.id },
    });
    const inc = movements.filter((m) => m.type === 'INCOME').reduce((acc, m) => acc + m.amount, 0);
    const exp = movements.filter((m) => m.type === 'EXPENSE').reduce((acc, m) => acc + m.amount, 0);

    const expectedFinal = caixa.initialBalance + inc - exp; // 100 + 30 - 10 = 120
    assert.strictEqual(expectedFinal, 120.0);

    // Fechamento com R$ 125 (Sobra de R$ 5)
    const actualCounted = 125.0;
    const diff = actualCounted - expectedFinal;

    const closedCaixa = await prisma.cashRegister.update({
      where: { id: caixa.id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        expectedBalance: expectedFinal,
        actualBalance: actualCounted,
        difference: diff,
      },
    });

    assert.strictEqual(closedCaixa.status, 'CLOSED');
    assert.strictEqual(closedCaixa.difference, 5.0, 'Deve registrar sobra de R$ 5,00');
  });

  test('5. Isolamento Multi-Tenant estrito', async () => {
    const shopBTransactions = await prisma.financialTransaction.findMany({
      where: { barbershopId: shopB.id },
    });

    assert.strictEqual(shopBTransactions.length, 0, 'Shop B cannot access Shop A transactions');
  });

  test('6. Dinheiro na Mesa: Rastreamento de Recuperação', async () => {
    const customer = await prisma.customer.create({
      data: {
        barbershopId: shopA.id,
        name: 'Cliente Recuperado Teste',
        phone: '11988887777',
      },
    });

    // Cria oportunidade pendente
    const opp = await prisma.moneyOnTheTableRecovery.create({
      data: {
        barbershopId: shopA.id,
        customerId: customer.id,
        opportunityAmount: 45.0,
        priority: 'ALTA',
        status: 'PENDING',
      },
    });

    assert.strictEqual(opp.status, 'PENDING');
    assert.strictEqual(opp.priority, 'ALTA');

    // Marca como recuperado
    const recovered = await prisma.moneyOnTheTableRecovery.update({
      where: { id: opp.id },
      data: {
        status: 'RECOVERED',
        recoveredAmount: 45.0,
        recoveredAt: new Date(),
      },
    });

    assert.strictEqual(recovered.status, 'RECOVERED');
    assert.strictEqual(recovered.recoveredAmount, 45.0);
  });
});
