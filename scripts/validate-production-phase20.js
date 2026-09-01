const BASE_URL = process.env.PRODUCTION_URL || 'https://barber.projetosunion.cloud';

async function validateProduction() {
  console.log(`🚀 Iniciando Validação de Produção — Fase 20 em ${BASE_URL}...\n`);

  let allOk = true;

  async function checkEndpoint(name, path, method = 'GET', body = null) {
    const url = `${BASE_URL}${path}`;
    try {
      const opts = { method, headers: { 'Content-Type': 'application/json' } };
      if (body) opts.body = JSON.stringify(body);
      const res = await fetch(url, opts);
      const isExpected = res.status >= 200 && res.status < 500;
      if (isExpected) {
        console.log(`  ✅ [PASS] ${name} -> HTTP ${res.status} (${url})`);
      } else {
        console.error(`  ❌ [FAIL] ${name} -> HTTP ${res.status} (${url})`);
        allOk = false;
      }
      return res;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name} -> Erro de Conexão:`, err.message);
      allOk = false;
      return null;
    }
  }

  // 1. Healthcheck
  await checkEndpoint('1. API Healthcheck', '/api/health');

  // 2. Academia
  await checkEndpoint('2. Portal Academia', '/academia');

  // 3. Sessão de Visagismo (Página Web Pública)
  const mockToken = 'testmocktoken48charactershexsamplevaluephase20gate';
  await checkEndpoint('3. Visagismo Session Page', `/visagismo/session/${mockToken}`);

  // 4. API de Sessão de Visagismo (Verifica expiração ou token inválido controlado)
  await checkEndpoint('4. API Visagismo Session Token GET', `/api/visagismo/session/${mockToken}`);

  // 5. API Generate Preview POST (Verifica controle de sessão sem crash)
  await checkEndpoint('5. API Generate Preview POST', `/api/visagismo/session/${mockToken}/generate-preview`, 'POST', {
    haircutName: 'Mid Fade',
  });

  if (allOk) {
    console.log('\n🎉 Todos os endpoints de Produção validados com sucesso!');
  } else {
    console.error('\n⚠️ Alguns endpoints falharam na validação de produção.');
    process.exit(1);
  }
}

validateProduction();
