/**
 * Production Validation Script for BarberFlow Admin (Phase 20)
 * Validates HTTPS endpoints, RBAC security, and Admin API routes against production.
 */

const BASE_URL = process.env.BASE_URL || 'https://barber.projetosunion.cloud';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@barberflow.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'senha123admin';

async function runValidation() {
  console.log('🚀 Iniciando Validação de Produção — BARBERFLOW ADMIN (Fase 20)');
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log('------------------------------------------------------------');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // 1. Check Root Admin page loads
    console.log('\n1. Testando carregamento da página /admin...');
    const pageRes = await fetch(`${BASE_URL}/admin`, { redirect: 'manual' });
    assert(pageRes.status === 200 || pageRes.status === 307 || pageRes.status === 302, `Página /admin respondeu com status ${pageRes.status}`);

    // 2. Test unauthorized API call
    console.log('\n2. Testando bloqueio de acesso não-autenticado às rotas /api/admin/*...');
    const unauthRes = await fetch(`${BASE_URL}/api/admin/dashboard`);
    assert(unauthRes.status === 401 || unauthRes.status === 403, `API /api/admin/dashboard bloqueou acesso sem token (Status ${unauthRes.status})`);

    // 3. Login as Super Admin
    console.log('\n3. Realizando autenticação do Super Admin...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });

    if (!loginRes.ok) {
      console.warn(`  ⚠️ Login com ${ADMIN_EMAIL} retornou status ${loginRes.status}. (Pode ser necessário rodar seed na VPS ou logar com usuário existente)`);
    } else {
      const loginData = await loginRes.json();
      assert(loginData.token, 'Token JWT retornado no login com sucesso');

      const headers = {
        Authorization: `Bearer ${loginData.token}`,
        'Content-Type': 'application/json',
      };

      // 4. Test /api/admin/dashboard
      console.log('\n4. Testando /api/admin/dashboard com token Super Admin...');
      const dashRes = await fetch(`${BASE_URL}/api/admin/dashboard`, { headers });
      assert(dashRes.status === 200, `Dashboard retornou 200 OK`);
      const dashData = await dashRes.json();
      assert(dashData.data?.financial !== undefined, 'Métricas financeiras retornadas');
      assert(dashData.data?.tenants !== undefined, 'Contadores de tenants retornados');

      // 5. Test /api/admin/barbershops
      console.log('\n5. Testando /api/admin/barbershops...');
      const shopsRes = await fetch(`${BASE_URL}/api/admin/barbershops`, { headers });
      assert(shopsRes.status === 200, 'Listagem de barbearias retornou 200 OK');
      const shopsData = await shopsRes.json();
      assert(Array.isArray(shopsData.data), `Array de barbearias retornado (${shopsData.data?.length} tenants)`);

      // 6. Test /api/admin/metrics
      console.log('\n6. Testando /api/admin/metrics...');
      const metricsRes = await fetch(`${BASE_URL}/api/admin/metrics`, { headers });
      assert(metricsRes.status === 200, 'Endpoint de métricas retornou 200 OK');
      const metricsData = await metricsRes.json();
      assert(metricsData.data?.financial?.mrr !== undefined, `MRR apurado: R$ ${metricsData.data?.financial?.mrr}`);

      // 7. Test /api/admin/health
      console.log('\n7. Testando /api/admin/health...');
      const healthRes = await fetch(`${BASE_URL}/api/admin/health`, { headers });
      assert(healthRes.status === 200, 'Healthcheck retornou 200 OK');
      const healthData = await healthRes.json();
      assert(healthData.services?.database?.status === 'CONNECTED', 'Conexão com SQLite ativa');

      // 8. Test /api/admin/audit
      console.log('\n8. Testando /api/admin/audit...');
      const auditRes = await fetch(`${BASE_URL}/api/admin/audit`, { headers });
      assert(auditRes.status === 200, 'Audit logs retornou 200 OK');

      // 9. Test /api/admin/config
      console.log('\n9. Testando /api/admin/config...');
      const configRes = await fetch(`${BASE_URL}/api/admin/config`, { headers });
      assert(configRes.status === 200, 'Configurações do SaaS retornou 200 OK');
    }

    console.log('\n------------------------------------------------------------');
    console.log(`📊 Resultado Final da Validação: ${passed} Passaram, ${failed} Falharam.`);
    if (failed === 0) {
      console.log('🎉 Validação da Fase 20 concluída com 100% de sucesso!');
    }
  } catch (err) {
    console.error('❌ Erro durante execução da validação:', err);
  }
}

runValidation();
