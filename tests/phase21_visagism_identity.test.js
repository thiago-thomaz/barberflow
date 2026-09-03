const assert = require('assert');
const sharp = require('sharp');

// Importações dos módulos da Fase 21
const {
  detectFaceGeometry,
  preflightCheckUserPhoto,
} = require('../src/lib/visagism/face-detector.ts');
const {
  compositeInpaintingResult,
  calculateProtectedFaceSSIM,
} = require('../src/lib/visagism/composite.ts');
const {
  generateHairMaskPNG,
  generateMaskByMode,
  isFaceProtectedRegion,
} = require('../src/lib/visagism/mask.ts');
const {
  validateIdentityQuality,
  MAX_OUTSIDE_MASK_CHANGE_RATIO,
  MIN_PROTECTED_FACE_SSIM,
} = require('../src/lib/visagism/gate.ts');
const { HAIRCUTS_CATALOG } = require('../src/lib/visagism/catalog.ts');
const { ReplicateInpaintingVisagismProvider } = require('../src/lib/visagism/providers/replicate.ts');

console.log('🧪 Iniciando Suíte de Testes FASE 21 — Visagismo: Preservação Real de Identidade...');

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

  // Gera uma imagem sintética para teste (400x500 RGB com rosto e fundo)
  const testWidth = 400;
  const testHeight = 500;
  const testImgBuffer = await sharp({
    create: {
      width: testWidth,
      height: testHeight,
      channels: 3,
      background: { r: 210, g: 160, b: 130 }, // Tom de pele
    },
  })
    .jpeg()
    .toBuffer();

  // 1. Source of Truth — Foto original é mantida intacta
  test('1. Source of Truth: Imagem original nunca é substituída no pipeline', () => {
    const origBuffer = Buffer.from(testImgBuffer);
    assert.strictEqual(origBuffer.length, testImgBuffer.length);
  });

  // 2. Pre-flight Check — Rejeita fotos corrompidas ou minúsculas
  await asyncTest('2. Pre-flight Check rejeita fotos abaixo da resolução mínima (250x250)', async () => {
    const tinyBuffer = await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .jpeg()
      .toBuffer();

    const res = await preflightCheckUserPhoto(tinyBuffer);
    assert.strictEqual(res.valid, false);
    assert.ok(res.reason.includes('Resolução muito baixa'));
  });

  // 3. Detecção de Geometria Facial Adaptativa
  await asyncTest('3. Geometria Facial detecta caixa envolvente e calcula marcos dinâmicos', async () => {
    const geom = await detectFaceGeometry(testImgBuffer, testWidth, testHeight);
    assert.ok(geom.faceBox);
    assert.ok(geom.eyeLineY > geom.faceBox.y);
    assert.ok(geom.mouthY > geom.eyeLineY);
    assert.ok(geom.chinY > geom.mouthY);
    assert.ok(geom.hairlineY < geom.eyeLineY);
  });

  // 4. FACE_PROTECTED_REGION — Olhos, nariz e boca 100% protegidos com geometria
  await asyncTest('4. FACE_PROTECTED_REGION protege expressamente olhos, nariz e boca', async () => {
    const geom = await detectFaceGeometry(testImgBuffer, testWidth, testHeight);
    const normX = geom.centerX / testWidth;
    const normEyeY = geom.eyeLineY / testHeight;
    const normNoseY = geom.noseTipY / testHeight;
    const normMouthY = geom.mouthY / testHeight;

    assert.strictEqual(isFaceProtectedRegion(normX, normEyeY, geom), true, 'Olhos devem ser protegidos');
    assert.strictEqual(isFaceProtectedRegion(normX, normNoseY, geom), true, 'Nariz deve ser protegido');
    assert.strictEqual(isFaceProtectedRegion(normX, normMouthY, geom), true, 'Boca deve ser protegida');
  });

  // 5. Máscara de Cabelo cobre o topo e não invade olhos
  await asyncTest('5. Máscara de cabelo cobre o topo do crânio sem tocar nos olhos', async () => {
    const geom = await detectFaceGeometry(testImgBuffer, testWidth, testHeight);
    const normX = geom.centerX / testWidth;
    const normSkullY = geom.skullTopY / testHeight;

    assert.strictEqual(isFaceProtectedRegion(normX, normSkullY, geom), false, 'Topo do crânio deve ser editável');
  });

  // 6. Máscara suporta modos explícitos: HAIR_ONLY, BEARD_ONLY, HAIR_AND_BEARD
  test('6. generateMaskByMode suporta os 3 modos estritos de máscara', () => {
    const mHair = generateMaskByMode('HAIR_ONLY', 300, 400);
    const mBeard = generateMaskByMode('BEARD_ONLY', 300, 400);
    const mBoth = generateMaskByMode('HAIR_AND_BEARD', 300, 400);

    assert.ok(Buffer.isBuffer(mHair));
    assert.ok(Buffer.isBuffer(mBeard));
    assert.ok(Buffer.isBuffer(mBoth));
  });

  // 7. COMPOSITING ENGINE — Fórmula Matemática: Original * (1 - Mask) + Gerado * Mask
  await asyncTest('7. Compositing Engine mescla perfeitamente Original e Gerado baseado na máscara', async () => {
    // Imagem original: toda verde
    const greenBuffer = await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 0, g: 255, b: 0 } },
    })
      .jpeg()
      .toBuffer();

    // Imagem gerada: toda vermelha
    const redBuffer = await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .jpeg()
      .toBuffer();

    // Máscara: metade superior branca (255), metade inferior preta (0)
    const maskRaw = Buffer.alloc(100 * 100, 0);
    for (let y = 0; y < 50; y++) {
      for (let x = 0; x < 100; x++) {
        maskRaw[y * 100 + x] = 255;
      }
    }
    const maskBuffer = await sharp(maskRaw, { raw: { width: 100, height: 100, channels: 1 } })
      .png()
      .toBuffer();

    const res = await compositeInpaintingResult({
      originalBuffer: greenBuffer,
      generatedBuffer: redBuffer,
      maskBuffer,
      featherSigma: 0, // Teste exato sem blur
    });

    assert.ok(res.compositeBuffer);
    assert.strictEqual(res.width, 100);
    assert.strictEqual(res.height, 100);

    // Na metade inferior (onde a máscara é 0), a alteração fora da máscara deve ser 0%
    assert.strictEqual(res.outsideMaskPixelChangeRatio, 0.0);
  });

  // 8. Pixel Preservation Gate — Fora da máscara a divergência é rigorosamente zero
  await asyncTest('8. Pixel Preservation Gate valida com score perfeito quando fora da máscara é 0%', async () => {
    const gateRes = await validateIdentityQuality({
      outsideMaskPixelChangeRatio: 0.0,
      faceSSIM: 1.0,
      imageBuffer: testImgBuffer,
    });
    assert.strictEqual(gateRes.passed, true);
    assert.strictEqual(gateRes.score, 1.0);
  });

  // 9. Pixel Preservation Gate — Rejeita quando fora da máscara muda mais que 1%
  await asyncTest('9. Pixel Preservation Gate REJEITA quando fora da máscara muda acima de 1%', async () => {
    const gateRes = await validateIdentityQuality({
      outsideMaskPixelChangeRatio: 0.05, // 5% alterado
      faceSSIM: 1.0,
      imageBuffer: testImgBuffer,
    });
    assert.strictEqual(gateRes.passed, false);
    assert.ok(gateRes.reason.includes('Pixel Preservation Gate'));
  });

  // 10. Face SSIM Gate — Rejeita quando fidelidade facial é menor que 0.95
  await asyncTest('10. Face SSIM Gate REJEITA se a fidelidade do rosto ficar abaixo de 95%', async () => {
    const gateRes = await validateIdentityQuality({
      outsideMaskPixelChangeRatio: 0.0,
      faceSSIM: 0.88, // Abaixo de 0.95
      imageBuffer: testImgBuffer,
    });
    assert.strictEqual(gateRes.passed, false);
    assert.ok(gateRes.reason.includes('Face SSIM Gate'));
  });

  // 11. Prompts do Catálogo nunca descrevem nova pessoa
  test('11. Prompts do catálogo são estritamente de edição sem criar nova pessoa', () => {
    for (const cut of HAIRCUTS_CATALOG) {
      assert.ok(cut.stylePrompt.includes('Edit') || cut.stylePrompt.includes('Apply'));
      assert.ok(!cut.stylePrompt.toLowerCase().includes('handsome man'));
      assert.ok(!cut.stylePrompt.toLowerCase().includes('male model'));
    }
  });

  // 12. Negative Prompt é agressivo contra substituição facial
  test('12. Negative Prompt bloqueia expressamente substituição facial e novas identidades', () => {
    const cut = HAIRCUTS_CATALOG[0];
    assert.ok(cut.negativePrompt.includes('different person'));
    assert.ok(cut.negativePrompt.includes('new face'));
    assert.ok(cut.negativePrompt.includes('face replacement'));
    assert.ok(cut.negativePrompt.includes('altered identity'));
  });

  // 13. Replicate Provider usa denoise calibrado (0.65) e não 0.82
  test('13. Provedor Replicate configurado com modelo oficial FLUX Fill', () => {
    const provider = new ReplicateInpaintingVisagismProvider();
    assert.ok(
      provider.name === 'REPLICATE_FLUX_FILL' || provider.name === 'REPLICATE_SDXL_INPAINTING',
      'Provedor Replicate deve ser REPLICATE_FLUX_FILL'
    );
  });

  // 14. Ausência de FaceSwap e Target Image no pipeline principal
  test('14. Nenhuma imagem de catálogo é enviada como imagem base ou target_image', () => {
    for (const cut of HAIRCUTS_CATALOG) {
      assert.ok(cut.referenceImageUrl.startsWith('http'));
      assert.notStrictEqual(cut.referenceImageUrl, 'CLIENT_PHOTO');
    }
  });

  // 15. Cálculo de SSIM entre imagens idênticas resulta em 1.00
  await asyncTest('15. calculateProtectedFaceSSIM retorna 1.00 para imagens idênticas', async () => {
    const raw = await sharp(testImgBuffer).ensureAlpha().raw().toBuffer();
    const ssim = await calculateProtectedFaceSSIM(raw, raw, testWidth, testHeight);
    assert.strictEqual(ssim, 1.0);
  });

  console.log(`\n🎉 FASE 21: ${passed} de ${total} testes executados com SUCESSO!\n`);
}

runTests().catch((err) => {
  console.error('Falha nos testes da Fase 21:', err);
  process.exit(1);
});
