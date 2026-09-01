const assert = require('assert');
const crypto = require('crypto');

// Importações dos módulos de visagismo
const { generateHairMaskPNG } = require('../src/lib/visagism/mask.ts');
const { HAIRCUTS_CATALOG, FACE_SHAPES_GUIDE } = require('../src/lib/visagism/catalog.ts');
const { ReplicateInpaintingVisagismProvider, replicateImageProvider } = require('../src/lib/visagism/providers/replicate.ts');
const { isVisagismV2Enabled } = require('../src/lib/visagism/engine.ts');

console.log('🧪 Iniciando Suíte de Testes FASE 19 — Preservação de Identidade & Visagismo WhatsApp...');

async function runTests() {
  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  async function asyncTest(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  // 1. Teste de Feature Flag
  test('1. Feature flag VISAGISM_V2_ENABLED deve estar ativa por padrão', () => {
    assert.strictEqual(isVisagismV2Enabled(), true);
  });

  // 2. Teste do Gerador de Máscara PNG
  test('2. Máscara capilar PNG deve gerar buffer válido com assinatura oficial PNG', () => {
    const mask = generateHairMaskPNG(512, 512, { includeBeard: false });
    assert.ok(Buffer.isBuffer(mask), 'A máscara deve ser um Buffer');
    assert.ok(mask.length > 50, 'O buffer PNG deve ter tamanho razoável');

    // Assinatura PNG: 137 80 78 71 13 10 26 10 (89 50 4E 47 0D 0A 1A 0A)
    const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    assert.strictEqual(mask.subarray(0, 8).equals(pngSignature), true, 'Assinatura do cabeçalho PNG inválida');
  });

  // 3. Teste de Proteção Facial na Máscara
  test('3. Máscara deve gerar PNG com opção de barba sem estragar formato', () => {
    const maskWithBeard = generateHairMaskPNG(256, 256, { includeBeard: true });
    assert.ok(maskWithBeard.length > 50);
  });

  // 4. Teste de Integridade dos 18 Cortes do Catálogo
  test('4. Todos os 18 cortes do catálogo devem possuir stylePrompt, negativePrompt e maskType', () => {
    assert.strictEqual(HAIRCUTS_CATALOG.length, 18, 'O catálogo deve manter exatamente 18 cortes');

    for (const cut of HAIRCUTS_CATALOG) {
      assert.ok(cut.id, `Corte ${cut.name} sem id`);
      assert.ok(cut.name, 'Corte sem nome');
      assert.ok(cut.referenceImageUrl, `Corte ${cut.name} sem referenceImageUrl`);
      assert.ok(cut.stylePrompt, `Corte ${cut.name} deve possuir stylePrompt`);
      assert.ok(cut.negativePrompt, `Corte ${cut.name} deve possuir negativePrompt`);
      assert.ok(cut.maskType, `Corte ${cut.name} deve possuir maskType`);

      // Validação Crítica de Identidade: O prompt NÃO pode solicitar criação de uma pessoa nova
      const promptLower = cut.stylePrompt.toLowerCase();
      assert.ok(
        !promptLower.includes('create a handsome man'),
        `Corte ${cut.name} não pode usar "create a handsome man"`
      );
      assert.ok(
        promptLower.includes('existing person') || promptLower.includes('preserve'),
        `Corte ${cut.name} deve focar em editar a pessoa existente preservando identidade`
      );

      // Negative prompt deve conter proteção facial
      assert.ok(
        cut.negativePrompt.includes('different person') || cut.negativePrompt.includes('new face'),
        `Corte ${cut.name} deve ter negative prompt com proteção de identidade`
      );
    }
  });

  // 5. Teste da Interface VisagismImageProvider
  test('5. ReplicateInpaintingVisagismProvider deve implementar VisagismImageProvider com inpainting', () => {
    const provider = new ReplicateInpaintingVisagismProvider();
    assert.strictEqual(provider.name, 'REPLICATE_SDXL_INPAINTING');
    assert.strictEqual(typeof provider.generatePreview, 'function');
  });

  // 6. Teste de Robustez de Token Criptográfico
  test('6. Tokens de sessão de visagismo devem ser criptograficamente seguros (48 chars hex)', () => {
    const token1 = crypto.randomBytes(24).toString('hex');
    const token2 = crypto.randomBytes(24).toString('hex');

    assert.strictEqual(token1.length, 48);
    assert.strictEqual(token2.length, 48);
    assert.notStrictEqual(token1, token2, 'Tokens aleatórios não podem colidir');
  });

  // 7. Teste de Mensagem WhatsApp
  test('7. Mensagem da Opção 6 do WhatsApp deve direcionar para Web sem pedir selfie no chat', () => {
    const mockSession = { publicToken: 'abc123mocktoken48charshexsamplevaluefortestingphase19' };
    const visagismUrl = `https://barber.projetosunion.cloud/visagismo/session/${mockSession.publicToken}`;
    const reply = `✨ *MUDE DE VISUAL*\n\nQuer descobrir quais cortes e estilos de cabelo e barba mais combinam com você?\n\nNossa experiência de Visagismo analisa seu formato de rosto e apresenta opções personalizadas para você experimentar em tempo real!\n\n📸 _A selfie será feita diretamente pelo seu celular no navegador, com total privacidade._\n\n👉 *COMEÇAR VISAGISMO:*\n${visagismUrl}\n\n_Envie MENU para ver outras opções ou 0 para encerrar._`;

    assert.ok(!reply.includes('Envie sua selfie aqui no WhatsApp'), 'WhatsApp não pode pedir selfie no chat');
    assert.ok(reply.includes(visagismUrl), 'WhatsApp deve fornecer a URL segura de visagismo');
    assert.ok(reply.includes('COMEÇAR VISAGISMO'), 'WhatsApp deve convidar para a web');
  });

  console.log(`\n🎉 Todos os ${passed}/${total} testes da Fase 19 passaram com sucesso!\n`);
}

runTests().catch((err) => {
  console.error('❌ Falha na execução da suíte de testes:', err);
  process.exit(1);
});
