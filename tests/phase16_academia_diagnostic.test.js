const test = require('node:test');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

test('BARBERFLOW FASE 16 — ACADEMIA 2.0: DIAGNÓSTICO INTELIGENTE & PLANO DE AÇÃO', async (t) => {
  let tenantA = null;
  let userA = null;
  let tenantB = null;
  let userB = null;
  let diagnosticEngine = null;
  let contentModule = null;
  let aiModule = null;
  const uniqueId = `phase16_${Date.now()}`;

  t.before(async () => {
    // Importa módulos TypeScript
    diagnosticEngine = await import('../src/lib/academia/diagnostic-engine.ts');
    contentModule = await import('../src/lib/academia/content.ts');
    aiModule = await import('../src/lib/academia/ai-consultant.ts');

    // Garante que as novas tabelas da Academia 2.0 existem no banco SQLite de teste
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AcademyDiagnostic" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "barbershopId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "answersJson" TEXT NOT NULL,
        "realMetricsJson" TEXT,
        "healthScore" INTEGER NOT NULL,
        "healthCategory" TEXT NOT NULL,
        "prioritiesJson" TEXT NOT NULL,
        "biggestProblem" TEXT,
        "missingDataJson" TEXT,
        "status" TEXT NOT NULL DEFAULT 'COMPLETED',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AcademyDiagnostic_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "AcademyDiagnostic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `).catch(() => {});

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AcademyActionPlan" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "barbershopId" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "diagnosticId" TEXT,
        "title" TEXT NOT NULL,
        "problem" TEXT NOT NULL,
        "whyItMatters" TEXT NOT NULL,
        "action" TEXT NOT NULL,
        "howTo" TEXT NOT NULL,
        "deadlineDays" INTEGER NOT NULL DEFAULT 7,
        "targetDeadline" DATETIME,
        "indicator" TEXT NOT NULL,
        "recommendedCategory" TEXT,
        "recommendedContentIds" TEXT,
        "recommendedToolId" TEXT,
        "recommendedChecklistId" TEXT,
        "status" TEXT NOT NULL DEFAULT 'PENDENTE',
        "completedAt" DATETIME,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AcademyActionPlan_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "AcademyActionPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "AcademyActionPlan_diagnosticId_fkey" FOREIGN KEY ("diagnosticId") REFERENCES "AcademyDiagnostic" ("id") ON DELETE SET NULL ON UPDATE CASCADE
      )
    `).catch(() => {});

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AcademyDiagnosticSnapshot" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "barbershopId" TEXT NOT NULL,
        "score" INTEGER NOT NULL,
        "category" TEXT NOT NULL,
        "metricsJson" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AcademyDiagnosticSnapshot_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `).catch(() => {});

    // Setup Tenant A
    tenantA = await prisma.barbershop.create({
      data: {
        name: `Barbearia Alpha ${uniqueId}`,
        slug: `alpha-${uniqueId}`,
        phone: '11988880001',
      },
    });

    userA = await prisma.user.create({
      data: {
        name: 'Dono Alpha',
        email: `alpha_${uniqueId}@barberflow.test`,
        passwordHash: 'dummy_hash',
        role: 'OWNER',
        barbershopId: tenantA.id,
      },
    });

    // Setup Tenant B
    tenantB = await prisma.barbershop.create({
      data: {
        name: `Barbearia Beta ${uniqueId}`,
        slug: `beta-${uniqueId}`,
        phone: '11988880002',
      },
    });

    userB = await prisma.user.create({
      data: {
        name: 'Dono Beta',
        email: `beta_${uniqueId}@barberflow.test`,
        passwordHash: 'dummy_hash',
        role: 'OWNER',
        barbershopId: tenantB.id,
      },
    });
  });

  t.after(async () => {
    // Cleanup
    if (tenantA) {
      await prisma.academyActionPlan.deleteMany({ where: { barbershopId: tenantA.id } }).catch(() => {});
      await prisma.academyDiagnosticSnapshot.deleteMany({ where: { barbershopId: tenantA.id } }).catch(() => {});
      await prisma.academyDiagnostic.deleteMany({ where: { barbershopId: tenantA.id } }).catch(() => {});
      await prisma.user.deleteMany({ where: { barbershopId: tenantA.id } }).catch(() => {});
      await prisma.barbershop.delete({ where: { id: tenantA.id } }).catch(() => {});
    }

    if (tenantB) {
      await prisma.academyActionPlan.deleteMany({ where: { barbershopId: tenantB.id } }).catch(() => {});
      await prisma.academyDiagnosticSnapshot.deleteMany({ where: { barbershopId: tenantB.id } }).catch(() => {});
      await prisma.academyDiagnostic.deleteMany({ where: { barbershopId: tenantB.id } }).catch(() => {});
      await prisma.user.deleteMany({ where: { barbershopId: tenantB.id } }).catch(() => {});
      await prisma.barbershop.delete({ where: { id: tenantB.id } }).catch(() => {});
    }

    await prisma.$disconnect();
  });

  await t.test('1. Estrutura do Questionário de Diagnóstico (15 Perguntas Obrigatórias)', async () => {
    const { DIAGNOSTIC_QUESTIONS } = diagnosticEngine;


    assert.equal(DIAGNOSTIC_QUESTIONS.length, 15, 'Deve conter exatamente 15 perguntas estruturadas');

    const expectedOrder = [
      'Quantos barbeiros trabalham atualmente?',
      'Qual o faturamento médio mensal?',
      'Quantos atendimentos realiza por mês?',
      'Qual o ticket médio aproximado?',
      'Quantos clientes ativos possui?',
      'Quantos clientes estão sem voltar?',
      'Você acompanha contas a pagar?',
      'Você acompanha contas a receber?',
      'Você sabe seu custo mensal?',
      'Você sabe quanto precisa faturar para atingir o ponto de equilíbrio?',
      'Você faz campanhas de reativação?',
      'Você acompanha a taxa de ocupação?',
      'Você possui meta mensal?',
      'Você acompanha lucro líquido?',
      'Qual seu maior problema atualmente?',
    ];

    DIAGNOSTIC_QUESTIONS.forEach((q, idx) => {
      assert.equal(q.order, idx + 1, `Pergunta ${idx + 1} deve possuir ordem sequencial`);
      assert.ok(q.title.includes(expectedOrder[idx].slice(0, 15)), `Pergunta ${idx + 1} deve corresponder ao texto oficial`);
    });

    const q15 = DIAGNOSTIC_QUESTIONS[14];
    assert.equal(q15.type, 'select');
    assert.ok(q15.options.includes('Atrair clientes'));
    assert.ok(q15.options.includes('Fazer clientes voltarem'));
    assert.ok(q15.options.includes('Aumentar faturamento'));
    assert.ok(q15.options.includes('Melhorar lucro'));
    assert.ok(q15.options.includes('Controlar despesas'));
    assert.ok(q15.options.includes('Organizar equipe'));
    assert.ok(q15.options.includes('Melhorar marketing'));
    assert.ok(q15.options.includes('Encher horários vazios'));
    assert.ok(q15.options.includes('Não sei'));
  });

  await t.test('2. Motor de Diagnóstico: Cálculo Determinístico do Score de Saúde (0 a 100)', async () => {
    const { runDiagnosticEvaluation } = diagnosticEngine;

    // Cenário Operação Excelente
    const excellentResult = runDiagnosticEvaluation({
      q1_barbersCount: 2,
      q2_monthlyRevenue: 28000,
      q3_monthlyAppointments: 500,
      q4_avgTicket: 56,
      q5_activeClients: 350,
      q6_inactiveClients: 20,
      q7_trackPayables: true,
      q8_trackReceivables: true,
      q9_knowsMonthlyCost: true,
      q10_knowsBreakEven: true,
      q11_doesReactivationCampaigns: true,
      q12_tracksOccupancyRate: true,
      q13_hasMonthlyGoal: true,
      q14_tracksNetProfit: true,
      q15_biggestProblem: 'Melhorar marketing',
    });

    assert.ok(excellentResult.healthScore >= 80, 'Score excelente deve ser >= 80');
    assert.equal(excellentResult.healthCategory, 'EXCELENTE');
    assert.equal(Object.keys(excellentResult.pillars).length, 6, 'Deve avaliar 6 pilares de gestão');

    // Cenário Operação Crítica (Baixa ocupação, muitos inativos, sem controle)
    const criticalResult = runDiagnosticEvaluation({
      q1_barbersCount: 3,
      q2_monthlyRevenue: 3500,
      q3_monthlyAppointments: 100,
      q4_avgTicket: 35,
      q5_activeClients: 40,
      q6_inactiveClients: 90,
      q7_trackPayables: false,
      q8_trackReceivables: false,
      q9_knowsMonthlyCost: false,
      q10_knowsBreakEven: false,
      q11_doesReactivationCampaigns: false,
      q12_tracksOccupancyRate: false,
      q13_hasMonthlyGoal: false,
      q14_tracksNetProfit: false,
      q15_biggestProblem: 'Encher horários vazios',
    });

    assert.ok(criticalResult.healthScore < 40, 'Score crítico deve ser < 40');
    assert.equal(criticalResult.healthCategory, 'CRITICO');
  });

  await t.test('3. Tratamento Resiliente de Dados Insuficientes / Barbearia Nova', async () => {
    const { runDiagnosticEvaluation } = diagnosticEngine;

    const emptyResult = runDiagnosticEvaluation({}, {
      barbersCount: 1,
      monthlyRevenue: 0,
      monthlyAppointments: 0,
      avgTicket: 0,
      activeClientsCount: 0,
      inactiveClientsCount: 0,
      occupancyRate: 0,
    });

    assert.equal(emptyResult.healthCategory, 'DADOS_INSUFICIENTES');
    assert.equal(emptyResult.healthScore, 0);
    assert.ok(emptyResult.missingData.isInsufficient, 'Deve sinalizar dados insuficientes');
    assert.ok(emptyResult.missingData.missingFields.length > 0, 'Deve listar campos faltantes');
    assert.ok(emptyResult.priorities.length > 0, 'Deve fornecer prioridade orientativa');
  });

  await t.test('4. Validação das 6 Regras Heurísticas Determinísticas', async () => {
    const { runDiagnosticEvaluation } = diagnosticEngine;

    // REGRA 1 — Ocupação < 50%
    const lowOccupancy = runDiagnosticEvaluation({
      q1_barbersCount: 2,
      q3_monthlyAppointments: 120, // max is ~750 => ~16%
      q15_biggestProblem: 'Encher horários vazios',
    });
    assert.equal(lowOccupancy.pillars.ocupacao.status, 'CRITICO');
    assert.ok(lowOccupancy.actionPlans.some((p) => p.problem.includes('Baixa ocupação')));

    // REGRA 2 — Clientes Inativos > 20%
    const highInactive = runDiagnosticEvaluation({
      q5_activeClients: 50,
      q6_inactiveClients: 50, // 50% inativo
      q15_biggestProblem: 'Fazer clientes voltarem',
    });
    assert.ok(highInactive.actionPlans.some((p) => p.problem.includes('clientes que não retornaram')));

    // REGRA 3 — Ticket Médio Baixo (< R$ 45)
    const lowTicket = runDiagnosticEvaluation({
      q4_avgTicket: 28,
      q15_biggestProblem: 'Aumentar faturamento',
    });
    assert.equal(lowTicket.pillars.ticket.status, 'CRITICO');
    assert.ok(lowTicket.actionPlans.some((p) => p.title.includes('Ticket Médio')));

    // REGRA 4 & 5 — Fluxo de Caixa e Despesas
    const cashFlowTension = runDiagnosticEvaluation(
      { q7_trackPayables: true, q8_trackReceivables: true },
      {
        barbersCount: 1,
        monthlyRevenue: 5000,
        monthlyAppointments: 100,
        avgTicket: 50,
        activeClientsCount: 80,
        inactiveClientsCount: 10,
        occupancyRate: 40,
        upcomingPayables7d: 4000,
        upcomingReceivables7d: 1000, // Payables > Receivables
      }
    );
    assert.ok(cashFlowTension.pillars.fluxo.diagnosis.includes('Atenção ao fluxo de caixa nos próximos 7 dias'));
  });

  await t.test('5. Painel "🎯 O que fazer hoje": Máximo de 3 Prioridades Relevantes', async () => {
    const { runDiagnosticEvaluation } = diagnosticEngine;

    const result = runDiagnosticEvaluation({
      q1_barbersCount: 2,
      q2_monthlyRevenue: 8000,
      q3_monthlyAppointments: 150,
      q4_avgTicket: 40,
      q5_activeClients: 80,
      q6_inactiveClients: 45,
      q7_trackPayables: false,
      q15_biggestProblem: 'Fazer clientes voltarem',
    });

    assert.ok(result.priorities.length <= 3, 'Deve conter no máximo 3 prioridades');
    assert.equal(result.priorities[0].rank, 1);
    assert.ok(result.priorities[0].actionUrl.startsWith('/'), 'Atalho de ação deve ser uma rota válida');
  });

  await t.test('6. Recomendações de Conteúdo Oficial da Academia (Allowlist & 100% Válidos)', async () => {
    const { runDiagnosticEvaluation, getRecommendedContents } = diagnosticEngine;
    const { ACADEMIA_CONTENTS } = contentModule;

    const result = runDiagnosticEvaluation({
      q15_biggestProblem: 'Encher horários vazios',
    });

    for (const plan of result.actionPlans) {
      if (plan.recommendedContentIds && plan.recommendedContentIds.length > 0) {
        const resolved = getRecommendedContents(plan.recommendedContentIds);
        assert.ok(resolved.length > 0, 'Deve resolver os conteúdos pelo ID');
        resolved.forEach((item) => {
          assert.ok(item.officialUrl.startsWith('https://'), 'URL de recomendação deve ser HTTPS oficial');
          assert.ok(ACADEMIA_CONTENTS.some((c) => c.id === item.id), 'Deve pertencer ao catálogo oficial de 80 conteúdos');
        });
      }
    }
  });

  await t.test('7. Ciclo de Vida do Plano de Ação no Banco: PENDENTE -> EM_ANDAMENTO -> CONCLUIDO', async () => {
    // Criação de item
    const actionPlan = await prisma.academyActionPlan.create({
      data: {
        barbershopId: tenantA.id,
        userId: userA.id,
        title: 'Campanha de Terça do Barbaço',
        problem: 'Ocupação baixa de terça-feira',
        whyItMatters: 'Custo fixo alto sem receita',
        action: 'Disparo de WhatsApp para 30 clientes',
        howTo: '1) Filtrar na recorrência; 2) Enviar mensagem',
        deadlineDays: 7,
        indicator: '+10 cortes na terça',
        status: 'PENDENTE',
      },
    });

    assert.equal(actionPlan.status, 'PENDENTE');
    assert.equal(actionPlan.completedAt, null);

    // Transição para EM_ANDAMENTO
    const inProgress = await prisma.academyActionPlan.update({
      where: { id: actionPlan.id },
      data: { status: 'EM_ANDAMENTO' },
    });
    assert.equal(inProgress.status, 'EM_ANDAMENTO');

    // Transição para CONCLUIDO
    const completed = await prisma.academyActionPlan.update({
      where: { id: actionPlan.id },
      data: { status: 'CONCLUIDO', completedAt: new Date() },
    });
    assert.equal(completed.status, 'CONCLUIDO');
    assert.ok(completed.completedAt !== null);
  });

  await t.test('8. Multi-Tenancy & Privacidade Estrita (Tenant A vs Tenant B)', async () => {
    // Diagnóstico Tenant A
    const diagA = await prisma.academyDiagnostic.create({
      data: {
        barbershopId: tenantA.id,
        userId: userA.id,
        answersJson: JSON.stringify({ q15_biggestProblem: 'Atrair clientes' }),
        healthScore: 75,
        healthCategory: 'SAUDAVEL',
        prioritiesJson: JSON.stringify([{ id: 'prio-1', title: 'Prioridade Alpha' }]),
      },
    });

    // Diagnóstico Tenant B
    const diagB = await prisma.academyDiagnostic.create({
      data: {
        barbershopId: tenantB.id,
        userId: userB.id,
        answersJson: JSON.stringify({ q15_biggestProblem: 'Controlar despesas' }),
        healthScore: 42,
        healthCategory: 'ATENCAO',
        prioritiesJson: JSON.stringify([{ id: 'prio-2', title: 'Prioridade Beta' }]),
      },
    });

    // Consulta Tenant A isolada
    const tenantADiagnostics = await prisma.academyDiagnostic.findMany({
      where: { barbershopId: tenantA.id },
    });
    assert.equal(tenantADiagnostics.length, 1);
    assert.equal(tenantADiagnostics[0].id, diagA.id);
    assert.equal(tenantADiagnostics[0].healthScore, 75);

    // Consulta Tenant B isolada
    const tenantBDiagnostics = await prisma.academyDiagnostic.findMany({
      where: { barbershopId: tenantB.id },
    });
    assert.equal(tenantBDiagnostics.length, 1);
    assert.equal(tenantBDiagnostics[0].id, diagB.id);
    assert.equal(tenantBDiagnostics[0].healthScore, 42);

    // Plano de ação Tenant A não é visível para Tenant B
    const tenantAPlans = await prisma.academyActionPlan.findMany({
      where: { barbershopId: tenantA.id },
    });
    const tenantBPlans = await prisma.academyActionPlan.findMany({
      where: { barbershopId: tenantB.id },
    });
    assert.ok(tenantAPlans.every((p) => p.barbershopId === tenantA.id));
    assert.equal(tenantBPlans.length, 0);
  });

  await t.test('9. Consultor BarberFlow: Respostas Rápidas Determinísticas e Zero API Paga', async () => {
    const { consultBarberFlowAi } = aiModule;


    const quickQuestions = [
      'Como aumentar meu faturamento?',
      'Estou cobrando pouco?',
      'Tenho clientes suficientes?',
      'Como reduzir horários vazios?',
      'Como melhorar minha recorrência?',
      'Minha situação financeira está saudável?',
      'Como aumentar meu ticket?',
    ];

    for (const q of quickQuestions) {
      const response = await consultBarberFlowAi(q, {
        monthlyRevenue: 15000,
        avgTicket: 50,
        monthlyAppointments: 300,
        inactiveClientsCount: 25,
        activeClientsCount: 200,
        barbersCount: 2,
        occupancyRate: 58.5,
      });

      assert.ok(response.topic, `Pergunta "${q}" deve possuir tópico definido`);
      assert.ok(response.problem, `Pergunta "${q}" deve possuir problema definido`);
      assert.ok(response.diagnosis, `Pergunta "${q}" deve possuir diagnóstico estruturado`);
      assert.ok(response.recommendation, `Pergunta "${q}" deve possuir recomendação clara`);
      assert.ok(Array.isArray(response.actionPlan), `Pergunta "${q}" deve possuir plano de ação`);
      assert.equal(response.actionPlan.length, 3, `Pergunta "${q}" deve conter 3 passos no plano`);
      assert.ok(response.metric, `Pergunta "${q}" deve conter métrica de acompanhamento`);
      assert.equal(response.modelUsed, 'DETERMINISTIC_RULES_ENGINE');
    }
  });

  await t.test('10. Snapshot Histórico de Evolução de Score', async () => {
    const snapshot = await prisma.academyDiagnosticSnapshot.create({
      data: {
        barbershopId: tenantA.id,
        score: 68,
        category: 'SAUDAVEL',
        metricsJson: JSON.stringify({ monthlyRevenue: 14000, avgTicket: 48 }),
      },
    });

    assert.ok(snapshot.id);
    assert.equal(snapshot.score, 68);
    assert.equal(snapshot.category, 'SAUDAVEL');
  });
});
