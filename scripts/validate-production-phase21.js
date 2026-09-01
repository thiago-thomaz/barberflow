const assert = require('node:assert/strict');

const BASE_URL = 'https://barber.projetosunion.cloud';

async function validatePhase21() {
  console.log('🌐 Validando Produção — BarberFlow Fase 21 (Login & Redirecionamento Super Admin)');
  console.log('Target:', BASE_URL);

  // 1. Login Super Admin
  const resAdmin = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@barberflow.com', password: 'senha123admin' }),
  });
  const dataAdmin = await resAdmin.json();
  assert.strictEqual(resAdmin.status, 200, 'Login do Super Admin deve retornar 200');
  assert.strictEqual(dataAdmin.success, true);
  assert.strictEqual(dataAdmin.user.role, 'SUPER_ADMIN', 'Role retornada deve ser SUPER_ADMIN');
  console.log('✅ 1. Login do SUPER_ADMIN validado: role = SUPER_ADMIN');

  const adminToken = dataAdmin.token;

  // 2. Login Owner / Demo
  const resOwner = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'dono@barbeariaimperial.com', password: 'senha123barber' }),
  });
  const dataOwner = await resOwner.json();
  assert.strictEqual(resOwner.status, 200, 'Login do Dono deve retornar 200');
  assert.strictEqual(dataOwner.success, true);
  assert.strictEqual(dataOwner.user.role, 'OWNER', 'Role retornada deve ser OWNER');
  console.log('✅ 2. Login do OWNER validado: role = OWNER');

  const ownerToken = dataOwner.token;

  // 3. Bloqueio de OWNER ao /api/admin/*
  const resOwnerAdminAccess = await fetch(`${BASE_URL}/api/admin/dashboard`, {
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  assert.strictEqual(resOwnerAdminAccess.status, 403, 'Acesso do OWNER ao /api/admin/* deve retornar 403 Forbidden');
  console.log('✅ 3. Bloqueio de invasão do OWNER ao /api/admin/dashboard (403 Forbidden) validado');

  // 4. Acesso do SUPER_ADMIN ao /api/admin/*
  const resSuperAdminAccess = await fetch(`${BASE_URL}/api/admin/dashboard`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.strictEqual(resSuperAdminAccess.status, 200, 'Acesso do SUPER_ADMIN deve retornar 200 OK');
  console.log('✅ 4. Acesso autorizado do SUPER_ADMIN ao /api/admin/dashboard (200 OK) validado');

  // 5. Middleware Edge interceptando rota pública desautenticada
  const resAdminPage = await fetch(`${BASE_URL}/admin`, { redirect: 'manual' });
  assert.ok([302, 307, 308].includes(resAdminPage.status), 'Acesso anônimo a /admin deve redirecionar para /login');
  console.log(`✅ 5. Middleware Edge de proteção a /admin validado (Status ${resAdminPage.status} Redirect)`);

  console.log('\n🎉 TODAS AS VALIDAÇÕES DA FASE 21 EM PRODUÇÃO FORAM APROVADAS COM SUCESSO!');
}

validatePhase21().catch((err) => {
  console.error('❌ Erro na validação da Fase 21:', err);
  process.exit(1);
});
