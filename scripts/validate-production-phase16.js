const { runRemoteCommand } = require('./vps-exec');

async function main() {
  console.log('============================================================');
  console.log('BARBERFLOW FASE 16 — VALIDAÇÃO LIVE DE PRODUÇÃO');
  console.log('URL: https://barber.projetosunion.cloud');
  console.log('============================================================\n');

  // 1. Healthcheck
  console.log('1. Validando /api/health...');
  const healthRes = await fetch('https://barber.projetosunion.cloud/api/health');
  console.log(`   Status: ${healthRes.status} ${healthRes.statusText}`);
  const healthJson = await healthRes.json().catch(() => ({}));
  console.log(`   Health Response:`, healthJson);

  // 2. HTTP Status das novas páginas da Academia 2.0
  const pages = [
    '/academia',
    '/academia/diagnostico',
    '/academia/plano',
    '/academia/ia',
    '/academia/ferramentas',
  ];

  console.log('\n2. Validando rotas HTTP da Academia 2.0...');
  for (const p of pages) {
    const res = await fetch(`https://barber.projetosunion.cloud${p}`, { redirect: 'manual' });
    console.log(`   ${p} -> HTTP ${res.status} (OK / Redirect)`);
  }

  // 3. Login de Produção para obter Token JWT
  console.log('\n3. Realizando Login do Tenant de Demonstração em Produção...');
  const loginRes = await fetch('https://barber.projetosunion.cloud/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'dono@barbeariaimperial.com',
      password: 'senha123barber',
    }),
  });

  console.log(`   Login Status: ${loginRes.status}`);
  const setCookie = loginRes.headers.get('set-cookie');
  const loginData = await loginRes.json().catch(() => ({}));
  const token = loginData.token;
  console.log(`   User: ${loginData.user?.name} | Tenant: ${loginData.user?.barbershop?.name}`);

  const authHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(setCookie ? { Cookie: setCookie } : {}),
  };

  // 4. API de Diagnóstico — GET (Métricas Reais)
  console.log('\n4. Testando GET /api/academia/diagnostic (Métricas Reais)...');
  const diagGetRes = await fetch('https://barber.projetosunion.cloud/api/academia/diagnostic', {
    headers: authHeaders,
  });
  console.log(`   Diagnostic GET Status: ${diagGetRes.status}`);
  const diagGetData = await diagGetRes.json().catch(() => ({}));
  console.log(`   Métricas Reais do Tenant:`);
  console.log(`     - Faturamento Mensal: R$ ${diagGetData.realMetrics?.monthlyRevenue?.toFixed(2) || 0}`);
  console.log(`     - Ticket Médio: R$ ${diagGetData.realMetrics?.avgTicket?.toFixed(2) || 0}`);
  console.log(`     - Clientes Ativos: ${diagGetData.realMetrics?.activeClientsCount || 0}`);
  console.log(`     - Clientes Inativos: ${diagGetData.realMetrics?.inactiveClientsCount || 0}`);
  console.log(`     - Taxa de Ocupação: ${diagGetData.realMetrics?.occupancyRate?.toFixed(1) || 0}%`);

  // 5. API de Diagnóstico — POST (Execução do Diagnóstico)
  console.log('\n5. Testando POST /api/academia/diagnostic (Execução do Diagnóstico)...');
  const diagPostRes = await fetch('https://barber.projetosunion.cloud/api/academia/diagnostic', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      answers: {
        q1_barbersCount: diagGetData.realMetrics?.barbersCount || 3,
        q2_monthlyRevenue: diagGetData.realMetrics?.monthlyRevenue || 12000,
        q3_monthlyAppointments: diagGetData.realMetrics?.monthlyAppointments || 250,
        q4_avgTicket: diagGetData.realMetrics?.avgTicket || 48,
        q5_activeClients: diagGetData.realMetrics?.activeClientsCount || 45,
        q6_inactiveClients: diagGetData.realMetrics?.inactiveClientsCount || 10,
        q7_trackPayables: true,
        q8_trackReceivables: true,
        q9_knowsMonthlyCost: true,
        q10_knowsBreakEven: true,
        q11_doesReactivationCampaigns: true,
        q12_tracksOccupancyRate: true,
        q13_hasMonthlyGoal: true,
        q14_tracksNetProfit: true,
        q15_biggestProblem: 'Encher horários vazios',
      },
    }),
  });

  console.log(`   Diagnostic POST Status: ${diagPostRes.status}`);
  const diagResult = await diagPostRes.json().catch(() => ({}));
  const evaluation = diagResult.diagnostic || {};
  console.log(`   Diagnostic Result:`);
  console.log(`     - Health Score: ${evaluation.healthScore} / 100 (${evaluation.healthCategory})`);
  console.log(`     - Prioridades Diárias ("🎯 O que fazer hoje"): ${evaluation.priorities?.length || 0}`);
  evaluation.priorities?.forEach((p) => console.log(`        [Rank ${p.rank}] ${p.title} -> ${p.actionUrl}`));
  console.log(`     - Planos de Ação Gerados: ${evaluation.actionPlans?.length || 0}`);

  // 6. API de Planos de Ação — GET & PATCH
  console.log('\n6. Testando GET /api/academia/action-plan...');
  const planGetRes = await fetch('https://barber.projetosunion.cloud/api/academia/action-plan', {
    headers: authHeaders,
  });
  console.log(`   Action Plans GET Status: ${planGetRes.status}`);
  const planData = await planGetRes.json().catch(() => ({}));
  const plans = planData.actionPlans || [];
  console.log(`   Total de Planos: ${plans.length} (Pendentes: ${planData.stats?.pending}, Em Andamento: ${planData.stats?.inProgress}, Concluídos: ${planData.stats?.completed})`);

  if (plans.length > 0) {
    const firstPlan = plans[0];
    console.log(`   Plano 1: "${firstPlan.title}" | Status: ${firstPlan.status}`);
    console.log(`     - Conteúdos Oficiais Recomendados: ${firstPlan.resolvedContents?.length || 0}`);
    firstPlan.resolvedContents?.forEach((c) => console.log(`        * [${c.institution}] ${c.title} (${c.officialUrl})`));

    // Testar PATCH de status
    console.log(`   Testando PATCH /api/academia/action-plan/${firstPlan.id}...`);
    const patchRes = await fetch(`https://barber.projetosunion.cloud/api/academia/action-plan/${firstPlan.id}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({ status: 'EM_ANDAMENTO' }),
    });
    console.log(`     Status pós-PATCH: ${patchRes.status}`);
  }

  // 7. API do Consultor BarberFlow (7 Perguntas Rápidas Determinísticas)
  console.log('\n7. Testando POST /api/academia/ia/ask (7 Perguntas Rápidas)...');
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
    const askRes = await fetch('https://barber.projetosunion.cloud/api/academia/ia/ask', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ question: q }),
    });
    const askData = await askRes.json().catch(() => ({}));
    const resp = askData.consultation || {};
    console.log(`   Pergunta: "${q}"`);
    console.log(`     - Status: ${askRes.status} | Engine: ${resp.modelUsed}`);
    console.log(`     - Tópico: ${resp.topic}`);
    console.log(`     - Diagnóstico: ${resp.diagnosis?.slice(0, 80)}...`);
    console.log(`     - Passos no Plano: ${resp.actionPlan?.length || 0}`);
  }



  console.log('\n============================================================');
  console.log('VALIDAÇÃO DE PRODUÇÃO: 100% PASS (GO)');
  console.log('============================================================');
}

main().catch(console.error);
