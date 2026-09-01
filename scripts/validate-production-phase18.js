/**
 * BarberFlow - Production Validation Suite (Phase 18)
 * Validação de integridade pós-deploy na VPS
 */

const BASE_URL = process.env.PRODUCTION_URL || 'https://barber.projetosunion.cloud';

async function validateRoute(name, path, expectedStatus = 200) {
  try {
    const url = `${BASE_URL}${path}`;
    const start = Date.now();
    const res = await fetch(url, { redirect: 'manual' });
    const duration = Date.now() - start;
    const ok = res.status === expectedStatus || (expectedStatus === 200 && res.status === 307); // 307 if redirected to login
    console.log(`[${ok ? 'PASS' : 'FAIL'}] ${name}: ${url} -> HTTP ${res.status} (${duration}ms)`);
    return ok;
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    return false;
  }
}

async function runValidation() {
  console.log('\n======================================================');
  console.log('🌐 VALIDAÇÃO REAL DE PRODUÇÃO — FASE 18 (GATE)');
  console.log(`URL Base: ${BASE_URL}`);
  console.log('======================================================\n');

  let passed = 0;
  let total = 0;

  const routes = [
    { name: 'Health Check API', path: '/api/health', status: 200 },
    { name: 'Visagismo Landing / Intro', path: '/visagismo', status: 200 },
    { name: 'Módulo Academia', path: '/academia', status: 200 },
    { name: 'Módulo Agenda', path: '/agenda', status: 200 },
    { name: 'Gestão Financeira', path: '/gestao-financeira', status: 200 },
    { name: 'Módulo Recorrência', path: '/recorrencia', status: 200 },
    { name: 'Módulo Automações', path: '/automacoes', status: 200 },
    { name: 'Página de Login', path: '/login', status: 200 },
  ];

  for (const r of routes) {
    total++;
    const ok = await validateRoute(r.name, r.path, r.status);
    if (ok) passed++;
  }

  // Validação do Webhook WhatsApp com Opção 6
  total++;
  console.log('\n--- Testando Inbound WhatsApp Webhook (Opção 6) ---');
  try {
    const res = await fetch(`${BASE_URL}/api/webhooks/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: '5514999990018',
        text: '6',
        tenantSlug: 'barbearia-imperial',
      }),
    });
    const data = await res.json();
    const hasPrompt = data.result?.reply?.includes('Vamos mudar seu visual') || data.result?.reply?.includes('selfie');
    console.log(`[${hasPrompt ? 'PASS' : 'FAIL'}] Webhook Opção 6: State=${data.result?.state}`);
    if (hasPrompt) passed++;
  } catch (err) {
    console.error(`[FAIL] Webhook Opção 6: ${err.message}`);
  }

  console.log('\n======================================================');
  console.log(`📊 GATE STATUS: ${passed}/${total} ROTAS E FLUXOS VALIDADOS`);
  console.log('======================================================\n');

  if (passed === total) {
    console.log('🚀 RESULTADO FINAL: GO — PRODUÇÃO ÍNTEGRA E OPERACIONAL!');
    process.exit(0);
  } else {
    console.error('⚠️ RESULTADO FINAL: CONDITIONAL GO / PENDÊNCIAS ENCONTRADAS');
    process.exit(1);
  }
}

runValidation();
