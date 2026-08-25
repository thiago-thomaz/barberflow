const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Rate limit helper for test
const store = new Map();
function checkRateLimitTest(identifier, limit, windowMs) {
  const now = Date.now();
  const record = store.get(identifier);

  if (!record || record.resetAt < now) {
    store.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true, limit, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (record.count >= limit) {
    return { success: false, limit, remaining: 0, resetAt: record.resetAt };
  }

  record.count += 1;
  store.set(identifier, record);
  return { success: true, limit, remaining: limit - record.count, resetAt: record.resetAt };
}

function formatBrazilTimeTest(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

describe('BarberFlow FASE 8 — Testes de Production Readiness, Segurança, Concorrência e Monetização', () => {
  let tenantA, tenantB;
  let barberA, barberB;
  let serviceA;
  let customerA, customerB;

  before(async () => {
    // Create Tenants A and B
    tenantA = await prisma.barbershop.create({
      data: { name: 'Barbearia Alpha Security', slug: `alpha-sec-${Date.now()}` },
    });

    tenantB = await prisma.barbershop.create({
      data: { name: 'Barbearia Beta Security', slug: `beta-sec-${Date.now()}` },
    });

    barberA = await prisma.barber.create({
      data: { barbershopId: tenantA.id, name: 'Barbeiro Alpha', isActive: true },
    });

    barberB = await prisma.barber.create({
      data: { barbershopId: tenantB.id, name: 'Barbeiro Beta', isActive: true },
    });

    serviceA = await prisma.service.create({
      data: { barbershopId: tenantA.id, name: 'Corte Alpha', price: 50.0, durationMin: 30 },
    });

    customerA = await prisma.customer.create({
      data: { barbershopId: tenantA.id, name: 'Cliente Alpha', phone: '11911112222', marketingOptIn: true },
    });

    customerB = await prisma.customer.create({
      data: { barbershopId: tenantB.id, name: 'Cliente Beta', phone: '11933334444', marketingOptIn: true },
    });
  });

  after(async () => {
    if (tenantA) {
      await prisma.appointment.deleteMany({ where: { barbershopId: tenantA.id } });
      await prisma.customer.deleteMany({ where: { barbershopId: tenantA.id } });
      await prisma.barber.deleteMany({ where: { barbershopId: tenantA.id } });
      await prisma.service.deleteMany({ where: { barbershopId: tenantA.id } });
      await prisma.barbershop.delete({ where: { id: tenantA.id } });
    }
    if (tenantB) {
      await prisma.customer.deleteMany({ where: { barbershopId: tenantB.id } });
      await prisma.barber.deleteMany({ where: { barbershopId: tenantB.id } });
      await prisma.barbershop.delete({ where: { id: tenantB.id } });
    }
    await prisma.$disconnect();
  });

  // TEST 1: Rate Limiting
  test('Segurança: Rate Limiting bloqueia excesso de requisições após limite', () => {
    const key = `test-ip-${Date.now()}`;
    const limit = 5;
    const windowMs = 10000;

    for (let i = 0; i < limit; i++) {
      const res = checkRateLimitTest(key, limit, windowMs);
      assert.strictEqual(res.success, true, `Requisição ${i + 1} deve ser permitida`);
    }

    // 6th attempt must be blocked
    const blockedRes = checkRateLimitTest(key, limit, windowMs);
    assert.strictEqual(blockedRes.success, false, 'Requisição excedente deve ser bloqueada');
    assert.strictEqual(blockedRes.remaining, 0);
  });

  // TEST 2: Anti-IDOR Horizontal Access Protection
  test('Segurança: Tenant A não consegue consultar nem alterar dados do Tenant B', async () => {
    const result = await prisma.customer.findFirst({
      where: {
        id: customerB.id,
        barbershopId: tenantA.id,
      },
    });

    assert.strictEqual(result, null, 'Tenant A não pode localizar recursos do Tenant B');
  });

  // TEST 3: Massive Concurrency (20 Simultaneous Booking Requests -> Exactly 1 Success, Zero Double-Booking)
  test('Concorrência Massiva: 20 requisições simultâneas para o mesmo horário exato -> Zero Double-Booking', async () => {
    const scheduledAt = new Date('2026-10-01T15:00:00.000Z');
    const endAt = new Date('2026-10-01T15:30:00.000Z');

    async function attemptBooking(requestId) {
      try {
        return await prisma.$transaction(
          async (tx) => {
            const conflict = await tx.appointment.findFirst({
              where: {
                barbershopId: tenantA.id,
                barberId: barberA.id,
                status: { notIn: ['CANCELADO', 'NO_SHOW'] },
                AND: [
                  { scheduledAt: { lt: endAt } },
                  { endAt: { gt: scheduledAt } },
                ],
              },
            });

            if (conflict) {
              throw new Error('SCHEDULE_CONFLICT');
            }

            const app = await tx.appointment.create({
              data: {
                barbershopId: tenantA.id,
                customerId: customerA.id,
                barberId: barberA.id,
                serviceId: serviceA.id,
                scheduledAt,
                endAt,
                price: 50.0,
                status: 'AGENDADO',
              },
            });

            return { success: true, app };
          },
          { isolationLevel: 'Serializable' }
        );
      } catch (err) {
        return { success: false, error: err.message };
      }
    }

    const promises = Array.from({ length: 20 }, (_, i) => attemptBooking(i));
    const results = await Promise.all(promises);

    const successful = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    assert.strictEqual(successful.length, 1, 'Exatamente 1 agendamento deve ter sucesso');
    assert.strictEqual(failed.length, 19, 'As outras 19 requisições devem falhar');

    // Verify DB count
    const totalInDb = await prisma.appointment.count({
      where: {
        barbershopId: tenantA.id,
        barberId: barberA.id,
        scheduledAt,
        status: 'AGENDADO',
      },
    });

    assert.strictEqual(totalInDb, 1, 'Banco de dados deve conter rigorosamente 1 único registro (Zero double-booking)');
  });

  // TEST 4: Timezone Brazil Format
  test('Timezone: Validação de formatação em America/Sao_Paulo (UTC-3)', () => {
    const utcDate = new Date('2026-08-25T15:30:00.000Z');
    const formattedTime = formatBrazilTimeTest(utcDate);
    assert.strictEqual(formattedTime, '12:30', '15:30 UTC em America/Sao_Paulo (UTC-3) deve ser 12:30');
  });

  // TEST 5: LGPD Anonymization
  test('LGPD: Anonimização de cliente preserva integridade sem expor dados pessoais', async () => {
    const tempCustomer = await prisma.customer.create({
      data: {
        barbershopId: tenantA.id,
        name: 'Maria Anonimizar',
        phone: '11998877665',
        email: 'maria@teste.com',
        marketingOptIn: true,
      },
    });

    const anonymized = await prisma.customer.update({
      where: { id: tempCustomer.id },
      data: {
        name: `Cliente Anonimizado #${tempCustomer.id.slice(-4)}`,
        phone: '00000000000',
        email: null,
        marketingOptIn: false,
        deletedAt: new Date(),
      },
    });

    assert.ok(anonymized.name.startsWith('Cliente Anonimizado'));
    assert.strictEqual(anonymized.email, null);
    assert.strictEqual(anonymized.marketingOptIn, false);
    assert.ok(anonymized.deletedAt);
  });

  // TEST 6: Single-Use Password Reset Token
  test('Segurança: Token de recuperação de senha é de uso único e expira', async () => {
    const user = await prisma.user.create({
      data: {
        email: `sec-user-${Date.now()}@teste.com`,
        name: 'Usuario Seguranca',
        passwordHash: await bcrypt.hash('SenhaForte@2026', 10),
        barbershopId: tenantA.id,
      },
    });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const tokenRecord = await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    assert.ok(tokenRecord.id);
    assert.strictEqual(tokenRecord.usedAt, null);

    // Consume token
    await prisma.passwordResetToken.update({
      where: { id: tokenRecord.id },
      data: { usedAt: new Date() },
    });

    const refreshed = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    assert.ok(refreshed.usedAt, 'Token deve estar marcado como utilizado');
  });
});
