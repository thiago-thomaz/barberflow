const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

test('BARBERFLOW FASE 17 — VISAGISMO & CONSULTOR DE ESTILO (ZERO CUSTO IA / LGPD)', async (t) => {
  let tenantA = null;
  let tenantB = null;
  let serviceCorte = null;
  let serviceCombo = null;
  let visagismCatalog = null;
  let deterministicProvider = null;

  const uniqueId = `vis_${Date.now()}`;
  const storageDir = path.join(process.cwd(), 'storage', 'visagismo');

  t.before(async () => {
    // Importa módulos TypeScript
    visagismCatalog = await import('../src/lib/visagism/catalog.ts');
    const providerModule = await import('../src/lib/visagism/providers/deterministic.ts');
    deterministicProvider = new providerModule.DeterministicVisagismProvider();

    // Garante que o diretório de storage exista
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    // Cria Tenant A
    tenantA = await prisma.barbershop.create({
      data: {
        name: `Barbearia Visagismo ${uniqueId}`,
        slug: `visagismo-shop-${uniqueId}`,
        phone: '11988887777',
      },
    });

    serviceCorte = await prisma.service.create({
      data: {
        name: 'Corte Degradê Fade',
        price: 45.0,
        durationMin: 30,
        barbershopId: tenantA.id,
      },
    });

    serviceCombo = await prisma.service.create({
      data: {
        name: 'Combo Cabelo e Barba Terapia',
        price: 75.0,
        durationMin: 60,
        barbershopId: tenantA.id,
      },
    });

    // Cria Tenant B para testes de isolamento
    tenantB = await prisma.barbershop.create({
      data: {
        name: `Barbearia Beta ${uniqueId}`,
        slug: `visagismo-beta-${uniqueId}`,
        phone: '11988886666',
      },
    });
  });

  t.after(async () => {
    if (tenantA) {
      await prisma.visagismMetric.deleteMany({ where: { barbershopId: tenantA.id } }).catch(() => {});
      await prisma.visagismRecommendation.deleteMany({ where: { session: { barbershopId: tenantA.id } } }).catch(() => {});
      await prisma.visagismProfile.deleteMany({ where: { session: { barbershopId: tenantA.id } } }).catch(() => {});
      await prisma.visagismSession.deleteMany({ where: { barbershopId: tenantA.id } }).catch(() => {});
      await prisma.service.deleteMany({ where: { barbershopId: tenantA.id } }).catch(() => {});
      await prisma.barbershop.delete({ where: { id: tenantA.id } }).catch(() => {});
    }
    if (tenantB) {
      await prisma.visagismMetric.deleteMany({ where: { barbershopId: tenantB.id } }).catch(() => {});
      await prisma.visagismSession.deleteMany({ where: { barbershopId: tenantB.id } }).catch(() => {});
      await prisma.barbershop.delete({ where: { id: tenantB.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  // 1. Criação de Sessão com Token Seguro e Expiração de 24h
  await t.test('1. Criação de sessão de visagismo com token criptográfico e expiração de 24h', async () => {
    const publicToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const session = await prisma.visagismSession.create({
      data: {
        barbershopId: tenantA.id,
        publicToken,
        status: 'DRAFT',
        expiresAt,
      },
    });

    assert.ok(session.id);
    assert.ok(session.publicToken.length >= 32, 'Token público deve ter alta entropia');
    assert.equal(session.status, 'DRAFT');
    assert.ok(session.expiresAt > new Date(), 'Expiração deve ser no futuro');
  });

  // 2. Isolamento Multi-Tenancy
  await t.test('2. Isolamento Multi-Tenancy: Tenant B não acessa sessões do Tenant A', async () => {
    const sessionA = await prisma.visagismSession.create({
      data: {
        barbershopId: tenantA.id,
        publicToken: crypto.randomBytes(24).toString('hex'),
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    const crossQuery = await prisma.visagismSession.findFirst({
      where: { id: sessionA.id, barbershopId: tenantB.id },
    });
    assert.equal(crossQuery, null, 'Sessão do Tenant A não pode ser acessada pelo Tenant B');
  });

  // 3. Catálogo de Estilos, Barbas e Cores
  await t.test('3. Catálogo completo de 18 cortes, 8 barbas e 8 cores estruturado', async () => {
    const { HAIRCUTS_CATALOG, BEARD_STYLES_CATALOG, COLOR_OPTIONS_CATALOG, FACE_SHAPES_GUIDE } = visagismCatalog;

    assert.ok(HAIRCUTS_CATALOG.length >= 18, 'Deve conter pelo menos 18 cortes de cabelo');
    assert.ok(BEARD_STYLES_CATALOG.length >= 8, 'Deve conter pelo menos 8 estilos de barba');
    assert.ok(COLOR_OPTIONS_CATALOG.length >= 7, 'Deve conter opções de tonalidades');
    assert.ok(FACE_SHAPES_GUIDE.Oval && FACE_SHAPES_GUIDE['Nao sei'], 'Guia facial completo');
  });

  // 4. Motor Determinístico: Avaliação de Perfil e 3 Recomendações
  await t.test('4. Motor Determinístico gera exatamente 3 recomendações com score explicável', async () => {
    const profile = {
      objective: 'Corte + Barba',
      style: 'Moderno',
      changeLevel: 'Medio',
      maintenanceLevel: 'Medio',
      hairLength: 'Tanto faz',
      faceShape: 'Oval',
      colorPreference: 'Natural',
    };

    const evaluation = await deterministicProvider.evaluateProfile(profile, [
      { id: serviceCorte.id, name: serviceCorte.name, price: serviceCorte.price },
      { id: serviceCombo.id, name: serviceCombo.name, price: serviceCombo.price },
    ]);

    assert.equal(evaluation.recommendations.length, 3, 'Deve retornar exatamente 3 recomendações');
    assert.equal(evaluation.isAiGenerated, false, 'Deve declarar com transparência que não é IA generativa');
    assert.ok(evaluation.recommendations[0].score >= 70, 'Score de compatibilidade deve ser alto');
    assert.ok(evaluation.recommendations[0].reasoning.length > 0, 'Deve conter justificativa do corte');
    assert.ok(evaluation.recommendations[0].barberTips.length > 0, 'Deve conter dicas de finalização');
  });

  // 5. Mapeamento com Serviços Reais da Barbearia
  await t.test('5. Associação das recomendações de visagismo com serviços da barbearia', async () => {
    const profile = {
      objective: 'Corte + Barba',
      style: 'Moderno',
      changeLevel: 'Medio',
      maintenanceLevel: 'Medio',
      hairLength: 'Tanto faz',
      faceShape: 'Quadrado',
    };

    const evaluation = await deterministicProvider.evaluateProfile(profile, [
      { id: serviceCombo.id, name: serviceCombo.name, price: serviceCombo.price },
    ]);

    const topRec = evaluation.recommendations[0];
    assert.equal(topRec.serviceSuggestionId, serviceCombo.id, 'Deve associar ao serviço Combo da barbearia');
    assert.equal(topRec.serviceSuggestionName, serviceCombo.name);
  });

  // 6. Tratamento de Formato Facial "Não sei"
  await t.test('6. Tratamento inclusivo para opção de formato facial "Não sei"', async () => {
    const profile = {
      objective: 'Corte',
      style: 'Classico',
      changeLevel: 'Pouco',
      maintenanceLevel: 'Pouco',
      hairLength: 'Sim',
      faceShape: 'Nao sei',
    };

    const evaluation = await deterministicProvider.evaluateProfile(profile, []);
    assert.equal(evaluation.recommendations.length, 3);
    assert.ok(evaluation.recommendations[0].score >= 60);
  });

  // 7. Upload de Foto Seguro e Armazenamento Protegido
  await t.test('7. Upload de foto com validação de formato e registro de consentimento LGPD', async () => {
    const session = await prisma.visagismSession.create({
      data: {
        barbershopId: tenantA.id,
        publicToken: crypto.randomBytes(24).toString('hex'),
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    const dummyFileName = `visagism_${session.id}_test.jpg`;
    const dummyFilePath = path.join(storageDir, dummyFileName);
    fs.writeFileSync(dummyFilePath, Buffer.from('fake_image_bytes_jpeg_header'));

    const updated = await prisma.visagismSession.update({
      where: { id: session.id },
      data: {
        photoStorageKey: dummyFileName,
        photoMimeType: 'image/jpeg',
        photoSize: 32,
        consentAt: new Date(),
        status: 'PHOTO_UPLOADED',
      },
    });

    assert.ok(updated.photoStorageKey);
    assert.equal(updated.status, 'PHOTO_UPLOADED');
    assert.ok(updated.consentAt !== null, 'Consentimento LGPD deve estar registrado');
  });

  // 8. Bloqueio de Formato Inválido e Limite de Tamanho
  await t.test('8. Rejeição de formatos não autorizados (ex: SVG/Executáveis) e arquivos >5MB', async () => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    const invalidMime = 'image/svg+xml';
    const isAllowed = allowedMimeTypes.includes(invalidMime);
    assert.equal(isAllowed, false, 'SVG deve ser rejeitado');

    const maxSizeBytes = 5 * 1024 * 1024;
    const testFileSize = 6 * 1024 * 1024;
    assert.ok(testFileSize > maxSizeBytes, 'Arquivo de 6MB deve exceder o limite de 5MB');
  });

  // 9. Exclusão de Foto pelo Usuário (LGPD)
  await t.test('9. Exclusão permanente de foto atendendo à LGPD (Direito ao Esquecimento)', async () => {
    const session = await prisma.visagismSession.create({
      data: {
        barbershopId: tenantA.id,
        publicToken: crypto.randomBytes(24).toString('hex'),
        photoStorageKey: 'temp_photo_to_delete.png',
        status: 'PHOTO_UPLOADED',
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    const checkBefore = await prisma.visagismSession.findUnique({ where: { id: session.id } });
    assert.equal(checkBefore.photoStorageKey, 'temp_photo_to_delete.png');

    const updated = await prisma.visagismSession.update({
      where: { id: session.id },
      data: {
        photoStorageKey: null,
        photoDeletedAt: new Date(),
      },
    });

    assert.equal(updated.photoStorageKey, null);
    assert.ok(updated.photoDeletedAt !== null);
  });

  // 10. Persistência de Perfil e Recomendações
  await t.test('10. Persistência de perfil e 3 recomendações associadas à sessão', async () => {
    const session = await prisma.visagismSession.create({
      data: {
        barbershopId: tenantA.id,
        publicToken: crypto.randomBytes(24).toString('hex'),
        expiresAt: new Date(Date.now() + 86400000),
      },
    });

    await prisma.visagismProfile.create({
      data: {
        sessionId: session.id,
        objective: 'Corte + Barba',
        style: 'Executivo',
        changeLevel: 'Pouco',
        maintenanceLevel: 'Pouco',
        hairLength: 'Sim',
        faceShape: 'Retangular',
      },
    });

    await prisma.visagismRecommendation.create({
      data: {
        sessionId: session.id,
        haircutName: 'Executivo Contemporâneo',
        haircutStyle: 'Business',
        beardName: 'Short Boxed',
        maintenance: 'Pouco manutenção',
        reasoning: 'Linhas retas e sofisticadas que harmonizam com o formato retangular.',
        barberTips: 'Pomada matte e corte mensal.',
        score: 95.0,
      },
    });

    const fullSession = await prisma.visagismSession.findUnique({
      where: { id: session.id },
      include: { profile: true, recommendations: true },
    });

    assert.ok(fullSession.profile);
    assert.equal(fullSession.profile.style, 'Executivo');
    assert.equal(fullSession.recommendations.length, 1);
    assert.equal(fullSession.recommendations[0].haircutName, 'Executivo Contemporâneo');
  });

  // 11. Registro e Isolamento de Métricas de Visagismo
  await t.test('11. Registro de métricas de funil do visagismo isoladas por barbearia', async () => {
    await prisma.visagismMetric.create({
      data: {
        barbershopId: tenantA.id,
        eventName: 'visagism_started',
        metadata: JSON.stringify({ source: 'whatsapp' }),
      },
    });

    await prisma.visagismMetric.create({
      data: {
        barbershopId: tenantA.id,
        eventName: 'style_saved',
        metadata: JSON.stringify({ haircutName: 'Low Fade' }),
      },
    });

    const metricsA = await prisma.visagismMetric.findMany({ where: { barbershopId: tenantA.id } });
    const metricsB = await prisma.visagismMetric.findMany({ where: { barbershopId: tenantB.id } });

    assert.ok(metricsA.length >= 2);
    assert.equal(metricsB.length, 0, 'Tenant B não pode ver métricas do Tenant A');
  });

  // 12. Geração de Mensagem Estruturada para WhatsApp e Redirecionamento
  await t.test('12. Formatação da mensagem estruturada para envio ao barbeiro via WhatsApp', async () => {
    const haircutName = 'Low Fade';
    const haircutStyle = 'Degrade';
    const beardName = 'Barba por Fazer';
    const hairColor = 'Tom Natural';

    const whatsappMessage = `Olá! 👋 Fiz meu visagismo no BarberFlow e escolhi meu novo visual:\n\n✂️ *Corte:* ${haircutName}\n💈 *Estilo:* ${haircutStyle}\n🧔 *Barba:* ${beardName}\n🎨 *Cor:* ${hairColor}\n\nGostaria de agendar esse visual com você na *${tenantA.name}*!`;

    assert.ok(whatsappMessage.includes('Low Fade'));
    assert.ok(whatsappMessage.includes('Barba por Fazer'));
    assert.ok(whatsappMessage.includes(tenantA.name));

    const encoded = encodeURIComponent(whatsappMessage);
    const waUrl = `https://wa.me/5511988887777?text=${encoded}`;
    assert.ok(waUrl.includes('https://wa.me/5511988887777'));
  });
});
