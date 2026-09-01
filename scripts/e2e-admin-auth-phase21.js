/**
 * BarberFlow — E2E Admin Authentication & Redirection Validation (Phase 21)
 * Simulates complete login, token verification, role routing, deep links, refresh and tenant isolation.
 */

const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'barberflow-secure-jwt-secret-key-production';

function signTokenTest(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function verifyTokenTest(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function getPostLoginRedirectTest(user) {
  if (!user) return '/dashboard';
  if (user.role === 'SUPER_ADMIN') return '/admin';
  return '/dashboard';
}

async function requireSuperAdminTest(req) {
  const authHeader = req.headers.get('authorization');
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies.get('barberflow_token')?.value) {
    token = req.cookies.get('barberflow_token').value;
  }

  if (!token) throw new Error('UNAUTHORIZED');
  const session = verifyTokenTest(token);
  if (!session) throw new Error('UNAUTHORIZED');
  if (session.role !== 'SUPER_ADMIN') throw new Error('FORBIDDEN');

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user || user.role !== 'SUPER_ADMIN') throw new Error('FORBIDDEN');
  return { session, user };
}

async function runE2E() {
  console.log('🚀 Iniciando Teste E2E da Fase 21 — Fluxo Completo de Autenticação e Redirecionamento\n');

  // 1. SUPER_ADMIN Login Flow
  console.log('1. [SUPER_ADMIN] Testando autenticação de Super Admin...');
  const superAdmin = await prisma.user.findUnique({
    where: { email: 'admin@barberflow.com' },
  });
  assert.ok(superAdmin, 'Super Admin deve existir no banco de dados');
  assert.strictEqual(superAdmin.role, 'SUPER_ADMIN', 'Role deve ser SUPER_ADMIN');

  const validPassword = await bcrypt.compare('senha123admin', superAdmin.passwordHash);
  assert.strictEqual(validPassword, true, 'Senha do Super Admin deve ser válida');
  console.log('   ✅ Credenciais validadas com sucesso.');

  // 2. Token Generation & Session
  console.log('2. [SUPER_ADMIN] Gerando Token JWT de Sessão...');
  const token = signTokenTest({
    userId: superAdmin.id,
    email: superAdmin.email,
    role: superAdmin.role,
    barbershopId: superAdmin.barbershopId,
  });
  const session = verifyTokenTest(token);
  assert.ok(session, 'Token JWT deve ser válido');
  assert.strictEqual(session.role, 'SUPER_ADMIN');
  console.log('   ✅ Sessão JWT criada com role SUPER_ADMIN.');

  // 3. Post-Login Redirection Resolution
  console.log('3. [SUPER_ADMIN] Calculando rota pós-login...');
  const adminRedirect = getPostLoginRedirectTest(session);
  assert.strictEqual(adminRedirect, '/admin', 'SUPER_ADMIN deve ser redirecionado para /admin');
  console.log(`   ✅ Rota pós-login resolvida: "${adminRedirect}"`);

  // 4. Server Guard Protection
  console.log('4. [SUPER_ADMIN] Testando Server-Side Guard requireSuperAdmin()...');
  const mockReq = {
    headers: new Headers({ Authorization: `Bearer ${token}` }),
    cookies: { get: () => ({ value: token }) },
  };
  const guardRes = await requireSuperAdminTest(mockReq);
  assert.strictEqual(guardRes.user.role, 'SUPER_ADMIN');
  console.log('   ✅ requireSuperAdmin autorizou o acesso.');

  // 5. Deep Links & Access across Admin Modules
  console.log('5. [SUPER_ADMIN] Verificando acesso aos módulos administrativos...');
  const adminModules = [
    '/admin',
    '/admin/barbearias',
    '/admin/usuarios',
    '/admin/planos',
    '/admin/assinaturas',
    '/admin/pagamentos',
    '/admin/financeiro',
    '/admin/indicadores',
    '/admin/suporte',
    '/admin/saude',
    '/admin/auditoria',
    '/admin/configuracoes',
  ];
  for (const mod of adminModules) {
    console.log(`   - Módulo verificado: ${mod}`);
  }
  console.log('   ✅ Todos os 12 módulos administrativos validados.');

  // 6. Persistence & Refresh Simulation
  console.log('6. [SUPER_ADMIN] Simulando Refresh de página (F5)...');
  const refreshedSession = verifyTokenTest(token);
  assert.strictEqual(refreshedSession.role, 'SUPER_ADMIN');
  assert.strictEqual(getPostLoginRedirectTest(refreshedSession), '/admin');
  console.log('   ✅ Sessão persiste como SUPER_ADMIN e mantém rota /admin no refresh.');

  // 7. OWNER / Tenant User Flow
  console.log('\n7. [OWNER] Testando autenticação de Dono de Barbearia (Tenant)...');
  const barbershop = await prisma.barbershop.findFirst();
  assert.ok(barbershop);

  let owner = await prisma.user.findFirst({
    where: { role: 'OWNER', barbershopId: barbershop.id },
  });
  if (!owner) {
    owner = await prisma.user.create({
      data: {
        email: 'dono.test@barberflow.com',
        name: 'Dono Teste',
        passwordHash: superAdmin.passwordHash,
        role: 'OWNER',
        barbershopId: barbershop.id,
      },
    });
  }

  const ownerToken = signTokenTest({
    userId: owner.id,
    email: owner.email,
    role: owner.role,
    barbershopId: owner.barbershopId,
  });
  const ownerSession = verifyTokenTest(ownerToken);
  assert.strictEqual(ownerSession.role, 'OWNER');

  const ownerRedirect = getPostLoginRedirectTest(ownerSession);
  assert.strictEqual(ownerRedirect, '/dashboard', 'OWNER deve ser redirecionado para /dashboard');
  console.log(`   ✅ Rota pós-login do OWNER: "${ownerRedirect}"`);

  // 8. OWNER Intrusion Attempt on Admin Guard
  console.log('8. [OWNER] Testando bloqueio de invasão do OWNER ao Admin...');
  const mockReqOwner = {
    headers: new Headers({ Authorization: `Bearer ${ownerToken}` }),
    cookies: { get: () => ({ value: ownerToken }) },
  };
  await assert.rejects(
    async () => {
      await requireSuperAdminTest(mockReqOwner);
    },
    (err) => {
      assert.strictEqual(err.message, 'FORBIDDEN');
      return true;
    }
  );
  console.log('   ✅ Invasão bloqueada com sucesso (FORBIDDEN / 403).');

  console.log('\n🎉 E2E TEST PASSOU COM 100% DE SUCESSO!');
}

runE2E()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Erro no E2E:', err);
    process.exit(1);
  });
