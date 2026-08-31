const test = require('node:test');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

test('ACADEMIA BARBERFLOW — SUITE COMPLETA DE TESTES (FASE 13)', async (t) => {
  let testBarbershop = null;
  let testUser = null;
  const uniqueId = `acad_${Date.now()}`;

  t.before(async () => {
    // Sincroniza tabelas da Academia no banco de teste
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "EducationProgress" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "barbershopId" TEXT NOT NULL,
        "contentId" TEXT NOT NULL,
        "isCompleted" BOOLEAN NOT NULL DEFAULT 1,
        "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "EducationProgress_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "EducationProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `).catch(() => {});

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "EducationFavorite" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "barbershopId" TEXT NOT NULL,
        "contentId" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "EducationFavorite_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "EducationFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `).catch(() => {});

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "EducationAiConsultation" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "barbershopId" TEXT NOT NULL,
        "question" TEXT NOT NULL,
        "topic" TEXT,
        "diagnosis" TEXT,
        "recommendation" TEXT,
        "actionPlanJson" TEXT,
        "metric" TEXT,
        "disclaimer" TEXT,
        "responseTimeMs" INTEGER,
        "modelUsed" TEXT NOT NULL DEFAULT 'DETERMINISTIC_RULES_ENGINE',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "EducationAiConsultation_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "EducationAiConsultation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `).catch(() => {});

    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "EducationProgress_userId_contentId_key" ON "EducationProgress"("userId", "contentId")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "EducationFavorite_userId_contentId_key" ON "EducationFavorite"("userId", "contentId")`).catch(() => {});

    // Setup clean test tenant and user
    testBarbershop = await prisma.barbershop.create({
      data: {
        name: `Barbearia Academia Test ${uniqueId}`,
        slug: `barbearia-acad-${uniqueId}`,
        phone: `11999${Math.floor(100000 + Math.random() * 900000)}`,
      },
    });

    testUser = await prisma.user.create({
      data: {
        name: 'Dono Academia Teste',
        email: `dono_${uniqueId}@barberflow.test`,
        passwordHash: 'dummy_hash',
        role: 'OWNER',
        barbershopId: testBarbershop.id,
      },
    });
  });

  t.after(async () => {
    // Cleanup
    if (testBarbershop) {
      await prisma.educationProgress.deleteMany({ where: { barbershopId: testBarbershop.id } }).catch(() => {});
      await prisma.educationFavorite.deleteMany({ where: { barbershopId: testBarbershop.id } }).catch(() => {});
      await prisma.educationAiConsultation.deleteMany({ where: { barbershopId: testBarbershop.id } }).catch(() => {});
      await prisma.user.deleteMany({ where: { barbershopId: testBarbershop.id } }).catch(() => {});
      await prisma.barbershop.delete({ where: { id: testBarbershop.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  await t.test('1. Catálogo de Conteúdos: Categorias, Formatos e URLs Oficiais Válidas', async () => {
    const { ACADEMIA_CONTENTS, ACADEMIA_CATEGORIES } = require('../src/lib/academia/content.ts');

    assert.ok(Array.isArray(ACADEMIA_CATEGORIES), 'Categorias deve ser um array');
    assert.ok(ACADEMIA_CATEGORIES.length >= 10, 'Deve conter pelo menos 10 categorias estruturadas');

    assert.ok(Array.isArray(ACADEMIA_CONTENTS), 'Conteúdos deve ser um array');
    assert.ok(ACADEMIA_CONTENTS.length >= 40, 'Deve conter acervo robusto de conteúdos');

    // Validação da Trilha Comece Aqui (10 módulos)
    const trilhaComeceAqui = ACADEMIA_CONTENTS.filter((c) => c.category === 'COMECE_AQUI');
    assert.strictEqual(trilhaComeceAqui.length, 10, 'Trilha Comece Aqui deve conter exatamente 10 módulos essenciais');

    // Validação de integridade de cada item
    for (const item of ACADEMIA_CONTENTS) {
      assert.ok(item.id, 'Item deve possuir ID único');
      assert.ok(item.title, `Item ${item.id} deve ter título`);
      assert.ok(item.institution, `Item ${item.id} deve ter instituição`);
      assert.ok(item.description, `Item ${item.id} deve ter descrição`);
      assert.ok(item.officialUrl.startsWith('http'), `Item ${item.id} deve ter URL oficial válida`);
      assert.strictEqual(item.isFree, true, `Item ${item.id} deve ser 100% gratuito`);
      assert.ok(['INICIANTE', 'INTERMEDIARIO', 'AVANCADO'].includes(item.level), `Item ${item.id} deve ter nível válido`);
    }
  });

  await t.test('2. Ferramentas: Validação Matemática das 12 Calculadoras', async () => {
    const { ACADEMIA_CALCULATORS } = require('../src/lib/academia/tools.ts');

    assert.strictEqual(ACADEMIA_CALCULATORS.length, 12, 'Devem existir exatamente 12 calculadoras');

    // 2.1 Calculadora de Preço de Venda
    const calcPreco = ACADEMIA_CALCULATORS.find((c) => c.id === 'calc-preco-venda');
    assert.ok(calcPreco, 'Calculadora de Preço de Venda deve existir');
    const resPreco = calcPreco.calculate({
      durationMin: 30,
      fixedCostPerHour: 24, // R$ 12 fixo no corte
      productCost: 3,
      commissionPercent: 50,
      targetProfit: 15,
    });
    // Base cost: 12 + 3 + 15 = 30. Preço a 50% comissão: 30 / (1 - 0.5) = 60.00
    assert.ok(resPreco.primaryResult.value.includes('60,00'), 'Preço calculado deve ser R$ 60,00');

    // 2.2 Calculadora de Ponto de Equilíbrio
    const calcPE = ACADEMIA_CALCULATORS.find((c) => c.id === 'calc-ponto-equilibrio');
    assert.ok(calcPE, 'Calculadora de Ponto de Equilíbrio deve existir');
    const resPE = calcPE.calculate({
      totalFixedCosts: 4000,
      avgTicket: 50,
      avgCommissionPercent: 50,
      avgProductCost: 5,
    });
    // Margem por corte: 50 * 0.5 - 5 = 20. Cortes: 4000 / 20 = 200 cortes
    assert.ok(resPE.primaryResult.value.includes('200 cortes'), 'Deve exigir 200 cortes para atingir o ponto de equilíbrio');

    // 2.3 Calculadora de Taxa de Ocupação
    const calcOcup = ACADEMIA_CALCULATORS.find((c) => c.id === 'calc-taxa-ocupacao');
    assert.ok(calcOcup, 'Calculadora de Taxa de Ocupação deve existir');
    const resOcup = calcOcup.calculate({
      chairsCount: 2,
      hoursPerDay: 10,
      daysPerMonth: 25,
      cutsDoneMonthly: 300,
      avgDurationMin: 30,
    });
    // Minutos disp: 2 * 10 * 60 * 25 = 30.000 min. Minutos ocup: 300 * 30 = 9.000 min -> 30%
    assert.ok(resOcup.primaryResult.value.includes('30.0%'), 'Taxa de ocupação deve ser calculada em 30.0%');

    // 2.4 Calculadora de Recorrência
    const calcRec = ACADEMIA_CALCULATORS.find((c) => c.id === 'calc-recorrencia-frequencia');
    assert.ok(calcRec, 'Calculadora de Recorrência deve existir');
    const resRec = calcRec.calculate({
      activeClients: 200,
      currentIntervalDays: 30,
      targetIntervalDays: 20,
      avgTicket: 50,
    });
    assert.ok(resRec.primaryResult.isPositive, 'Redução de intervalo deve gerar ganho financeiro positivo');
  });

  await t.test('3. Geradores de Conteúdo (8) e Checklists (9)', async () => {
    const { ACADEMIA_GENERATORS, ACADEMIA_CHECKLISTS } = require('../src/lib/academia/tools.ts');

    assert.strictEqual(ACADEMIA_GENERATORS.length, 8, 'Devem existir 8 geradores estratégicos');
    assert.strictEqual(ACADEMIA_CHECKLISTS.length, 9, 'Devem existir 9 checklists operacionais');

    // Teste de geração de Stories
    const genStories = ACADEMIA_GENERATORS.find((g) => g.id === 'gen-instagram-stories');
    const outStories = genStories.generate({
      dayOfWeek: 'Quinta-feira',
      focus: 'Lotar Horários Vazios',
      barbershopName: 'Barbearia Alpha',
    });
    assert.ok(outStories.title.includes('Quinta-feira'), 'Título deve conter o dia da semana');
    assert.ok(outStories.content.includes('Barbearia Alpha'), 'Conteúdo deve conter o nome da loja');

    // Teste de integridade de Checklists
    for (const chk of ACADEMIA_CHECKLISTS) {
      assert.ok(chk.items.length >= 3, `Checklist ${chk.id} deve ter pelo menos 3 tarefas`);
    }
  });

  await t.test('4. Motor IA Consultivo BarberFlow: Estrutura em 5 Blocos e Disclaimers', async () => {
    const { consultBarberFlowAi } = require('../src/lib/academia/ai-consultant.ts');

    // 4.1 Consulta sobre Horários Vazios
    const consultVazios = await consultBarberFlowAi('Como preencher horários vazios na terça e quarta?', {
      monthlyRevenue: 12000,
      occupancyRate: 45,
      inactiveClientsCount: 30,
    });
    assert.ok(consultVazios.problem, 'Deve conter problema identificado');
    assert.ok(consultVazios.diagnosis, 'Deve conter diagnóstico');
    assert.ok(consultVazios.recommendation, 'Deve conter recomendação');
    assert.strictEqual(consultVazios.actionPlan.length, 3, 'Plano de ação deve ter 3 passos');
    assert.ok(consultVazios.metric, 'Deve conter métrica de acompanhamento');
    assert.strictEqual(consultVazios.modelUsed, 'DETERMINISTIC_RULES_ENGINE');

    // 4.2 Consulta sobre MEI / Legislação (com Disclaimer Legal)
    const consultMei = await consultBarberFlowAi('Quais os limites do MEI para cabeleireiro e barbeiro?');
    assert.ok(consultMei.disclaimer, 'Consultas de legislação devem anexar disclaimer legal/tributário');
    assert.ok(consultMei.disclaimer.includes('educacional'), 'Disclaimer deve informar natureza educacional');

    // 4.3 Consulta sobre Comissões e Lei Salão Parceiro
    const consultComissao = await consultBarberFlowAi('Quanto devo pagar de comissão para barbeiro parceiro?');
    assert.ok(consultComissao.topic.includes('Comissões') || consultComissao.topic.includes('Gestão'));
    assert.ok(consultComissao.actionPlan.length === 3);
  });

  await t.test('5. Persistência de Progresso, Favoritos e Consultas no Banco de Dados', async () => {
    // 5.1 Salvar Progresso de Conteúdo
    const progress = await prisma.educationProgress.upsert({
      where: {
        userId_contentId: {
          userId: testUser.id,
          contentId: 'trilha-m1-entenda-seu-negocio',
        },
      },
      update: { isCompleted: true },
      create: {
        userId: testUser.id,
        barbershopId: testBarbershop.id,
        contentId: 'trilha-m1-entenda-seu-negocio',
        isCompleted: true,
      },
    });
    assert.ok(progress.id, 'Progresso salvo com sucesso');
    assert.strictEqual(progress.isCompleted, true);

    // 5.2 Salvar Favorito
    const fav = await prisma.educationFavorite.create({
      data: {
        userId: testUser.id,
        barbershopId: testBarbershop.id,
        contentId: 'financas-sebrae-preco-venda',
      },
    });
    assert.ok(fav.id, 'Favorito criado com sucesso');

    // 5.3 Salvar Consulta de IA
    const aiLog = await prisma.educationAiConsultation.create({
      data: {
        userId: testUser.id,
        barbershopId: testBarbershop.id,
        question: 'Como aumentar o ticket médio?',
        topic: 'Alavancagem de Faturamento',
        diagnosis: 'Venda de produtos de cuidados masculinos',
        recommendation: 'Oferecer pomadas na saída',
        actionPlanJson: JSON.stringify([{ step: 1, title: 'Treinar equipe', detail: 'Explicar benefícios' }]),
        metric: 'Meta: + R$ 10 de ticket médio',
        modelUsed: 'DETERMINISTIC_RULES_ENGINE',
      },
    });
    assert.ok(aiLog.id, 'Consulta de IA salva no banco');

    // 5.4 Teste de Isolamento Multi-Tenant
    const otherBarbershop = await prisma.barbershop.create({
      data: {
        name: `Outra Barbearia ${uniqueId}`,
        slug: `outra-barb-${uniqueId}`,
        phone: '11988887777',
      },
    });

    const otherTenantLogs = await prisma.educationAiConsultation.findMany({
      where: { barbershopId: otherBarbershop.id },
    });
    assert.strictEqual(otherTenantLogs.length, 0, 'Tenant isolado não deve enxergar dados de outro tenant');

    await prisma.barbershop.delete({ where: { id: otherBarbershop.id } });
  });
});
