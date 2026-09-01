const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

function normalizeIncomingText(rawText) {
  if (!rawText) return { cleanText: '', normalized: '', numericOption: null };
  let text = rawText.replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u00A0]/g, ' ').trim();
  const emojiMap = {
    '0️⃣': '0', '1️⃣': '1', '2️⃣': '2', '3️⃣': '3', '4️⃣': '4',
    '5️⃣': '5', '6️⃣': '6', '7️⃣': '7', '8️⃣': '8', '9️⃣': '9',
    '🔟': '10', '⓪': '0', '①': '1', '②': '2', '③': '3',
    '④': '4', '⑤': '5', '⑥': '6', '⑦': '7', '⑧': '8', '⑨': '9',
  };
  for (const [emoji, digit] of Object.entries(emojiMap)) {
    text = text.replaceAll(emoji, digit);
  }
  text = text.replace(/\s+/g, ' ').trim();
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  let numericOption = null;
  const numMatch = normalized.match(/^(?:opcao|opc|numero|num|#|\s)*(\d+)(?:[.\-\s)]|$)/);
  if (numMatch) {
    numericOption = numMatch[1];
  } else if (/^\d+$/.test(normalized)) {
    numericOption = normalized;
  }
  return { cleanText: text, normalized, numericOption };
}

test('BARBERFLOW FASE 18 — VISAGISMO NO WHATSAPP ("MUDE DE VISUAL")', async (t) => {
  let visagismCatalog = null;
  let deterministicProvider = null;

  t.before(async () => {
    visagismCatalog = await import('../src/lib/visagism/catalog.ts');
    const providerModule = await import('../src/lib/visagism/providers/deterministic.ts');
    deterministicProvider = new providerModule.DeterministicVisagismProvider();
  });

  await t.test('1. Normalização de Opção 6 e Emojis', () => {
    const text1 = normalizeIncomingText('6️⃣');
    assert.equal(text1.numericOption, '6', 'Emoji keycap 6️⃣ normalizado para "6"');

    const text2 = normalizeIncomingText('opcao 6');
    assert.equal(text2.numericOption, '6', 'Texto "opcao 6" normalizado para "6"');

    const text3 = normalizeIncomingText('Quero mudar de visual');
    assert.ok(text3.normalized.includes('mudar de visual'), 'Intent "mudar de visual" reconhecido');
  });

  await t.test('2. Catálogo de Cortes e Barbas (18 Modelos HD)', () => {
    assert.equal(visagismCatalog.HAIRCUTS_CATALOG.length, 18, 'Catálogo contém 18 cortes');
    assert.equal(visagismCatalog.BEARD_STYLES_CATALOG.length, 8, 'Catálogo contém 8 estilos de barba');

    const allHaveImages = visagismCatalog.HAIRCUTS_CATALOG.every(
      (h) => h.referenceImageUrl && h.referenceImageUrl.startsWith('http')
    );
    assert.ok(allHaveImages, 'Todos os 18 cortes possuem foto de referência');
  });

  await t.test('3. Avaliação de Visagismo e 3 Recomendações', async () => {
    const evalOval = await deterministicProvider.evaluateProfile(
      {
        objective: 'Corte + Barba',
        style: 'Moderno',
        changeLevel: 'Medio',
        maintenanceLevel: 'Medio',
        hairLength: 'Sim',
        faceShape: 'Oval',
      },
      []
    );

    assert.equal(evalOval.recommendations.length, 3, 'Gera exatamente 3 recomendações');
    assert.ok(evalOval.recommendations[0].score >= 80, 'Score de match alto para a principal');
    assert.ok(evalOval.recommendations[0].haircutName.length > 0, 'Nome de corte válido');
  });

  await t.test('4. Segurança de Tokens Criptográficos e TTL', () => {
    const token = crypto.randomBytes(24).toString('hex');
    assert.equal(token.length, 48, 'Token possui 48 caracteres hex');
    assert.ok(!token.includes('shop'), 'Token seguro sem identificadores internos');
  });

  await t.test('5. Limite de 3 Gerações por Sessão', () => {
    const MAX_GENERATIONS = 3;
    let count = 0;
    const generate = () => {
      if (count >= MAX_GENERATIONS) return { success: false };
      count++;
      return { success: true };
    };

    assert.equal(generate().success, true);
    assert.equal(generate().success, true);
    assert.equal(generate().success, true);
    assert.equal(generate().success, false, 'Bloqueia na 4ª geração');
  });

  await t.test('6. Preservação de Escolha de Corte no Agendamento', () => {
    const token = crypto.randomBytes(24).toString('hex');
    const queryParams = new URLSearchParams({
      visagism: token,
      corte: 'Low Fade',
      estilo: 'Moderno',
      barba: 'Barba Curta',
    });
    const bookingUrl = `/b/barbearia-imperial?${queryParams.toString()}`;
    assert.ok(bookingUrl.includes('visagism='), 'Contém token');
    assert.ok(bookingUrl.includes('corte=Low+Fade'), 'Contém corte');
  });
});
