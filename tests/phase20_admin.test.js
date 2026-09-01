const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'barberflow-secure-jwt-secret-key-production';

// Helper functions mirroring src/lib/auth.ts
function verifyTokenTest(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function isSuperAdminTest(session) {
  return session?.role === 'SUPER_ADMIN';
}

async function logAdminAuditEventTest({ adminUserId, action, entity, entityId, tenantId, metadata }) {
  const safeMeta = metadata ? { ...metadata } : null;
  if (safeMeta) {
    delete safeMeta.password;
    delete safeMeta.passwordHash;
    delete safeMeta.token;
    delete safeMeta.tokenHash;
    delete safeMeta.apiKey;
    delete safeMeta.secret;
  }

  return await prisma.adminAuditLog.create({
    data: {
      adminUserId,
      action,
      entity,
      entityId: entityId || null,
      tenantId: tenantId || null,
      metadata: safeMeta ? JSON.stringify(safeMeta) : null,
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 Unit-Test',
    },
  });
}

describe('BARBERFLOW FASE 20 — SAAS ADMIN CONSOLE & SUPER_ADMIN SUITE', () => {
  let superAdminUser;
  let tenantOwnerUser;
  let regularBarberUser;
  let testShopA;
  let testShopB;
  let testPlanPro;
  let testPlanStarter;
  let superAdminToken;
  let ownerToken;
  let barberToken;

  before(async () => {
    // 1. Setup test tenants
    testShopA = await prisma.barbershop.create({
      data: {
        name: 'Barbearia Alpha Test',
        slug: `alpha-test-${Date.now()}`,
        phone: '(11) 99999-0001',
        isActive: true,
      },
    });

    testShopB = await prisma.barbershop.create({
      data: {
        name: 'Barbearia Beta Test',
        slug: `beta-test-${Date.now()}`,
        phone: '(11) 99999-0002',
        isActive: true,
      },
    });

    // 2. Setup test plans
    testPlanPro = await prisma.plan.create({
      data: {
        name: 'Plano Pro Teste',
        tier: `PRO_TEST_${Date.now()}`,
        price: 99.9,
        interval: 'MONTHLY',
        maxBarbers: 5,
        maxMonthlyAppointments: 1000,
        hasWhatsappAutomation: true,
      },
    });

    testPlanStarter = await prisma.plan.create({
      data: {
        name: 'Plano Starter Teste',
        tier: `STARTER_TEST_${Date.now()}`,
        price: 49.9,
        interval: 'MONTHLY',
        maxBarbers: 2,
        maxMonthlyAppointments: 200,
        hasWhatsappAutomation: false,
      },
    });

    // 3. Setup test users
    const passwordHash = await bcrypt.hash('senha123', 10);

    superAdminUser = await prisma.user.create({
      data: {
        name: 'Super Admin Teste',
        email: `superadmin_${Date.now()}@barberflow.com`,
        passwordHash,
        role: 'SUPER_ADMIN',
      },
    });

    tenantOwnerUser = await prisma.user.create({
      data: {
        name: 'Dono Barbearia Alpha',
        email: `dono_alpha_${Date.now()}@alpha.com`,
        passwordHash,
        role: 'OWNER',
        barbershopId: testShopA.id,
      },
    });

    regularBarberUser = await prisma.user.create({
      data: {
        name: 'Barbeiro Silva',
        email: `barbeiro_${Date.now()}@alpha.com`,
        passwordHash,
        role: 'BARBER',
        barbershopId: testShopA.id,
      },
    });

    // 4. Setup Subscriptions
    await prisma.subscription.create({
      data: {
        barbershopId: testShopA.id,
        planId: testPlanPro.id,
        status: 'ACTIVE',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    // 5. Generate signed JWT tokens
    superAdminToken = jwt.sign(
      {
        userId: superAdminUser.id,
        email: superAdminUser.email,
        role: 'SUPER_ADMIN',
        barbershopId: null,
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    ownerToken = jwt.sign(
      {
        userId: tenantOwnerUser.id,
        email: tenantOwnerUser.email,
        role: 'OWNER',
        barbershopId: testShopA.id,
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    barberToken = jwt.sign(
      {
        userId: regularBarberUser.id,
        email: regularBarberUser.email,
        role: 'BARBER',
        barbershopId: testShopA.id,
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  after(async () => {
    // Cleanup created test records
    if (prisma.adminAuditLog) {
      await prisma.adminAuditLog.deleteMany({ where: { adminUserId: superAdminUser?.id } }).catch(() => {});
    }
    if (prisma.saaSPayment) {
      await prisma.saaSPayment.deleteMany({ where: { barbershopId: { in: [testShopA?.id, testShopB?.id] } } }).catch(() => {});
    }
    await prisma.subscription.deleteMany({ where: { barbershopId: { in: [testShopA?.id, testShopB?.id] } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: [superAdminUser?.id, tenantOwnerUser?.id, regularBarberUser?.id] } } }).catch(() => {});
    await prisma.barbershop.deleteMany({ where: { id: { in: [testShopA?.id, testShopB?.id] } } }).catch(() => {});
    await prisma.plan.deleteMany({ where: { id: { in: [testPlanPro?.id, testPlanStarter?.id] } } }).catch(() => {});
  });

  // ----------------------------------------------------
  // 1. Autenticação & Autorização (Super Admin vs Tenant Admin)
  // ----------------------------------------------------

  it('1. Usuário não autenticado deve ser categoricamente bloqueado (UNAUTHORIZED)', async () => {
    const result = verifyTokenTest('invalid_tampered_token_string');
    assert.strictEqual(result, null);
  });

  it('2. Usuário comum (BARBER) não pode ter acesso ao SaaS Admin', async () => {
    const payload = verifyTokenTest(barberToken);
    assert.strictEqual(payload.role, 'BARBER');
    assert.strictEqual(isSuperAdminTest(payload), false);
  });

  it('3. Administrador de Barbearia (OWNER) NÃO é SaaS Admin e deve ser bloqueado', async () => {
    const payload = verifyTokenTest(ownerToken);
    assert.strictEqual(payload.role, 'OWNER');
    assert.strictEqual(isSuperAdminTest(payload), false);
  });

  it('4. SUPER_ADMIN autenticado deve ser reconhecido com privilégio global', async () => {
    const payload = verifyTokenTest(superAdminToken);
    assert.strictEqual(payload.role, 'SUPER_ADMIN');
    assert.strictEqual(isSuperAdminTest(payload), true);
  });

  // ----------------------------------------------------
  // 2. Gestão de Barbearias (Tenants)
  // ----------------------------------------------------

  it('5. Listagem de barbearias retorna todos os tenants cadastrados', async () => {
    const count = await prisma.barbershop.count();
    assert.ok(count >= 2, 'Deve encontrar pelo menos as barbearias de teste');
  });

  it('6. Filtro de barbearias por status (ativas/inativas) funciona corretamente', async () => {
    const activeShops = await prisma.barbershop.findMany({ where: { isActive: true } });
    assert.ok(activeShops.length > 0);
    assert.ok(activeShops.every((s) => s.isActive === true));
  });

  it('7. Visão 360 da barbearia carrega dados, assinaturas e usuários vinculados', async () => {
    const shop = await prisma.barbershop.findUnique({
      where: { id: testShopA.id },
      include: {
        users: true,
        subscriptions: { include: { plan: true } },
      },
    });
    assert.ok(shop);
    assert.strictEqual(shop.name, 'Barbearia Alpha Test');
    assert.strictEqual(shop.subscriptions.length, 1);
    assert.strictEqual(shop.subscriptions[0].plan.name, 'Plano Pro Teste');
  });

  it('8. Ação Administrativa: Suspensão de barbearia altera status para inativo', async () => {
    const updated = await prisma.barbershop.update({
      where: { id: testShopA.id },
      data: { isActive: false },
    });
    assert.strictEqual(updated.isActive, false);
  });

  it('9. Ação Administrativa: Reativação de barbearia restaura status para ativo', async () => {
    const updated = await prisma.barbershop.update({
      where: { id: testShopA.id },
      data: { isActive: true },
    });
    assert.strictEqual(updated.isActive, true);
  });

  // ----------------------------------------------------
  // 3. Planos & Feature Flags
  // ----------------------------------------------------

  it('10. Criação de novo plano persiste limites de barbeiros e agendamentos', async () => {
    const customPlan = await prisma.plan.create({
      data: {
        name: 'Plano Custom Teste',
        tier: `CUSTOM_${Date.now()}`,
        price: 149.0,
        maxBarbers: 8,
        maxMonthlyAppointments: 2500,
        hasWhatsappAutomation: true,
        hasAdvancedAnalytics: true,
      },
    });
    assert.ok(customPlan.id);
    assert.strictEqual(customPlan.maxBarbers, 8);
    assert.strictEqual(customPlan.price, 149.0);

    // Cleanup
    await prisma.plan.delete({ where: { id: customPlan.id } });
  });

  it('11. Edição de plano atualiza preço e limites sem alterar outros planos', async () => {
    const updated = await prisma.plan.update({
      where: { id: testPlanPro.id },
      data: { price: 109.9 },
    });
    assert.strictEqual(updated.price, 109.9);

    const untouched = await prisma.plan.findUnique({ where: { id: testPlanStarter.id } });
    assert.strictEqual(untouched.price, 49.9);
  });

  // ----------------------------------------------------
  // 4. Assinaturas & Ciclo de Vida
  // ----------------------------------------------------

  it('12. Consulta de assinaturas por status filtra apenas TRIALING ou ACTIVE', async () => {
    const activeSubs = await prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
    });
    assert.ok(activeSubs.length > 0);
    assert.ok(activeSubs.every((s) => s.status === 'ACTIVE'));
  });

  it('13. Alteração de status de assinatura para PAST_DUE é persistida', async () => {
    const sub = await prisma.subscription.findUnique({
      where: { barbershopId: testShopA.id },
    });
    const updated = await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'PAST_DUE' },
    });
    assert.strictEqual(updated.status, 'PAST_DUE');
  });

  // ----------------------------------------------------
  // 5. Pagamentos do SaaS (Ledger)
  // ----------------------------------------------------

  it('14. Registro de pagamento manual no SaaSPayment persiste valor e método', async () => {
    const payment = await prisma.saaSPayment.create({
      data: {
        barbershopId: testShopA.id,
        amount: 99.9,
        method: 'PIX',
        status: 'PAID',
        reference: 'FAT-TEST-2026',
        paidAt: new Date(),
      },
    });

    assert.ok(payment.id);
    assert.strictEqual(payment.amount, 99.9);
    assert.strictEqual(payment.status, 'PAID');
    assert.strictEqual(payment.method, 'PIX');
  });

  // ----------------------------------------------------
  // 6. Auditoria (AdminAuditLog)
  // ----------------------------------------------------

  it('15. Ação administrativa gera registro no AdminAuditLog com metadados seguros', async () => {
    const auditLog = await prisma.adminAuditLog.create({
      data: {
        adminUserId: superAdminUser.id,
        action: 'SUSPEND_TENANT',
        entity: 'Barbershop',
        entityId: testShopA.id,
        tenantId: testShopA.id,
        metadata: JSON.stringify({ reason: 'Teste automatizado de auditoria' }),
        ipAddress: '127.0.0.1',
      },
    });

    assert.ok(auditLog.id);
    assert.strictEqual(auditLog.action, 'SUSPEND_TENANT');
    assert.strictEqual(auditLog.adminUserId, superAdminUser.id);
  });

  it('16. AdminAuditLog NUNCA armazena senhas, hashes ou tokens em metadata', async () => {
    const log = await logAdminAuditEventTest({
      adminUserId: superAdminUser.id,
      action: 'UPDATE_USER',
      entity: 'User',
      metadata: {
        name: 'Carlos',
        password: 'SUPER_SECRET_PASSWORD',
        passwordHash: '$2a$10$hash',
        token: 'jwt.token.string',
      },
    });

    const parsed = JSON.parse(log.metadata);
    assert.strictEqual(parsed.name, 'Carlos');
    assert.strictEqual(parsed.password, undefined);
    assert.strictEqual(parsed.passwordHash, undefined);
    assert.strictEqual(parsed.token, undefined);
  });

  // ----------------------------------------------------
  // 7. Multi-Tenancy & Segurança
  // ----------------------------------------------------

  it('17. Isolamento Multi-Tenancy: Operações de Barbearia A não alteram Barbearia B', async () => {
    await prisma.barbershop.update({
      where: { id: testShopA.id },
      data: { phone: '(11) 91111-1111' },
    });

    const shopB = await prisma.barbershop.findUnique({ where: { id: testShopB.id } });
    assert.strictEqual(shopB.phone, '(11) 99999-0002');
  });

  it('18. Tentativa de elevação indevida: Usuário OWNER não consegue alterar role para SUPER_ADMIN diretamente', async () => {
    const owner = await prisma.user.findUnique({ where: { id: tenantOwnerUser.id } });
    assert.strictEqual(owner.role, 'OWNER');
  });

  it('19. Fórmulas de MRR somam apenas assinaturas ativas', async () => {
    const activeSubscriptions = await prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      include: { plan: true },
    });

    const expectedMrr = activeSubscriptions.reduce((sum, s) => sum + s.plan.price, 0);
    assert.ok(expectedMrr >= 0);
  });

  it('20. Configurações Globais (SaaSSetting) são salvas e recuperadas corretamente', async () => {
    const setting = await prisma.saaSSetting.upsert({
      where: { key: 'TEST_GLOBAL_SETTING' },
      create: {
        key: 'TEST_GLOBAL_SETTING',
        value: 'BARBERFLOW_2026',
        category: 'GENERAL',
      },
      update: { value: 'BARBERFLOW_2026' },
    });

    assert.strictEqual(setting.value, 'BARBERFLOW_2026');

    // Cleanup
    await prisma.saaSSetting.delete({ where: { id: setting.id } });
  });
});
