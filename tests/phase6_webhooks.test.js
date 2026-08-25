const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function signWebhookPayload(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

describe('BarberFlow FASE 6 — Testes de Automações, Webhooks e Assinaturas HMAC', () => {
  let shop;
  const webhookSecret = 'test_whsec_secret_123456';

  before(async () => {
    shop = await prisma.barbershop.create({
      data: {
        name: 'Barbearia Webhooks Test',
        slug: `barbearia-wh-${Date.now()}`,
      },
    });
  });

  after(async () => {
    if (shop) {
      await prisma.webhook.deleteMany({ where: { barbershopId: shop.id } });
      await prisma.barbershop.delete({ where: { id: shop.id } });
    }
    await prisma.$disconnect();
  });

  test('Segurança: Geração e validação de assinatura HMAC-SHA256', () => {
    const rawPayload = JSON.stringify({
      event: 'APPOINTMENT_CREATED',
      tenant_id: shop.id,
      timestamp: '2026-08-25T18:00:00.000Z',
      data: { customerName: 'João Silva', price: 50.0 },
    });

    const signature = signWebhookPayload(rawPayload, webhookSecret);
    assert.ok(signature);
    assert.strictEqual(typeof signature, 'string');
    assert.strictEqual(signature.length, 64, 'Assinatura SHA-256 em hex deve ter 64 caracteres');

    // Verification
    const recalculated = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawPayload)
      .digest('hex');

    assert.strictEqual(signature, recalculated, 'Assinatura deve coincidir exatamente');
  });

  test('Segurança: Assinatura é inválida com chave secreta incorreta', () => {
    const rawPayload = JSON.stringify({ event: 'TEST' });
    const sigA = signWebhookPayload(rawPayload, 'secret_A');
    const sigB = signWebhookPayload(rawPayload, 'secret_B');

    assert.notStrictEqual(sigA, sigB);
  });

  test('Webhooks: Cadastro de endpoint n8n com isolamento multitenant', async () => {
    const webhook = await prisma.webhook.create({
      data: {
        barbershopId: shop.id,
        url: 'https://n8n.example.com/webhook/test',
        secret: webhookSecret,
        events: JSON.stringify(['APPOINTMENT_CREATED', 'CUSTOMER_AT_RISK']),
        isActive: true,
      },
    });

    assert.ok(webhook.id);
    assert.strictEqual(webhook.barbershopId, shop.id);
    assert.strictEqual(webhook.isActive, true);
  });
});
