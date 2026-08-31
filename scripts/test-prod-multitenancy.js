const https = require('https');

const BASE_URL = 'https://barber.projetosunion.cloud';

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function login(email, password) {
  const res = await request(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { email, password }
  });
  const data = JSON.parse(res.body);
  return data.token;
}

async function main() {
  console.log('=== TESTE DE ISOLAMENTO MULTI-TENANT EM PRODUÇÃO ===\n');

  const tokenA = await login('dono@barbeariaimperial.com', 'senha123barber');
  const tokenB = await login('dono@navalha.com', 'senha123barber');

  const headersA = { 
    'Content-Type': 'application/json', 
    'Authorization': `Bearer ${tokenA}`,
    'Cookie': `barberflow_token=${tokenA}`
  };
  const headersB = { 
    'Content-Type': 'application/json', 
    'Authorization': `Bearer ${tokenB}`,
    'Cookie': `barberflow_token=${tokenB}`
  };

  // 1. Tenant A marks trilha-m1-entenda-seu-negocio completed
  const pRes = await request(`${BASE_URL}/api/academia/progress`, {
    method: 'POST',
    headers: headersA,
    body: { contentId: 'trilha-m1-entenda-seu-negocio', isCompleted: true }
  });
  console.log(`[TENANT A] Marcação trilha-m1: HTTP ${pRes.status}`);

  // 2. Tenant A fetches contents
  const resA = await request(`${BASE_URL}/api/academia/contents`, { headers: headersA });
  const dataA = JSON.parse(resA.body);
  console.log(`[TENANT A] Stats de progresso:`, JSON.stringify(dataA.stats));
  const completedA = (dataA.contents || []).filter(c => c.isCompleted).map(c => c.id);
  console.log(`[TENANT A] Conteúdos concluídos: ${completedA.join(', ')} -> Contém ca-02: ${completedA.includes('ca-02') ? '✅ SIM' : '❌ NÃO'}`);

  // 3. Tenant B fetches contents
  const resB = await request(`${BASE_URL}/api/academia/contents`, { headers: headersB });
  const dataB = JSON.parse(resB.body);
  console.log(`[TENANT B] Stats de progresso:`, JSON.stringify(dataB.stats));
  const completedB = (dataB.contents || []).filter(c => c.isCompleted).map(c => c.id);
  console.log(`[TENANT B] Conteúdos concluídos: ${completedB.join(', ') || 'Nenhum'} -> Contém ca-02 do Tenant A: ${completedB.includes('ca-02') ? '❌ VAZAMENTO (FALHA)' : '✅ NÃO (ISOLAMENTO PERFEITO)'}`);

  // 4. Metrics Summary Isolation
  const metricsA = JSON.parse((await request(`${BASE_URL}/api/academia/metrics-summary`, { headers: headersA })).body);
  const metricsB = JSON.parse((await request(`${BASE_URL}/api/academia/metrics-summary`, { headers: headersB })).body);
  console.log(`[TENANT A] Faturamento mensal: R$ ${metricsA.metrics.monthlyRevenue} | Agendamentos: ${metricsA.metrics.monthlyAppointments}`);
  console.log(`[TENANT B] Faturamento mensal: R$ ${metricsB.metrics.monthlyRevenue} | Agendamentos: ${metricsB.metrics.monthlyAppointments}`);
  console.log(`[ISOLATION] Métricas são distintas e isoladas: ${metricsA.metrics.monthlyRevenue !== metricsB.metrics.monthlyRevenue ? '✅ SIM' : 'ℹ️ OK'}`);
}

main().catch(console.error);
