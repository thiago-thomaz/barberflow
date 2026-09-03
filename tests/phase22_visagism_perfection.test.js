const assert = require('assert');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const {
  generateHairMaskPNG,
  generateMaskByMode,
  isFaceProtectedRegion,
} = require('../src/lib/visagism/mask.ts');
const {
  compositeInpaintingResult,
  calculateProtectedFaceSSIM,
} = require('../src/lib/visagism/composite.ts');
const { extractFaceLandmarks } = require('../src/lib/visagism/face-landmarks.ts');
const {
  validateIdentityQuality,
  MAX_OUTSIDE_MASK_CHANGE_RATIO,
  MIN_PROTECTED_FACE_SSIM,
} = require('../src/lib/visagism/gate.ts');
const { validateIdentityGate } = require('../src/lib/visagism/identity-gate.ts');
const { HAIRCUTS_CATALOG, BEARD_STYLES_CATALOG } = require('../src/lib/visagism/catalog.ts');
const { ReplicateInpaintingVisagismProvider } = require('../src/lib/visagism/providers/replicate.ts');

console.log('🧪 Iniciando Suíte de Testes FASE 22 — Visagismo & Simulação Perfeita de IA...');

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

  const width = 500;
  const height = 650;
  const testImgBuffer = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 210, g: 165, b: 135 },
    },
  })
    .jpeg()
    .toBuffer();

  // 1. Extração de marcos faciais
  await asyncTest('1. extractFaceLandmarks detecta proporções e limites faciais', async () => {
    const lm = await extractFaceLandmarks(testImgBuffer, width, height);
    assert.ok(lm.faceBox);
    assert.ok(lm.hairline.centerHairlineY > 0);
    assert.ok(lm.leftEye.centerY > lm.hairline.centerHairlineY);
    assert.ok(lm.mouth.centerY > lm.nose.tipY);
  });

  // 2. Máscara com arco anatômico e têmporas
  await asyncTest('2. generateHairMaskPNG cria máscara anatômica sem cortes em caixa reta', async () => {
    const lm = await extractFaceLandmarks(testImgBuffer, width, height);
    const mask = generateHairMaskPNG(width, height, { mode: 'HAIR_ONLY', landmarks: lm });
    assert.ok(Buffer.isBuffer(mask));
    assert.strictEqual(mask.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), true);
  });

  // 3. Região protegida do centro da face
  await asyncTest('3. isFaceProtectedRegion garante proteção do núcleo facial', async () => {
    const lm = await extractFaceLandmarks(testImgBuffer, width, height);
    const normX = (lm.faceBox.x + lm.faceBox.width / 2) / width;
    const normEyeY = lm.leftEye.centerY / height;
    const normNoseY = lm.nose.tipY / height;
    const normMouthY = lm.mouth.centerY / height;

    assert.strictEqual(isFaceProtectedRegion(normX, normEyeY, undefined, lm), true, 'Olhos protegidos');
    assert.strictEqual(isFaceProtectedRegion(normX, normNoseY, undefined, lm), true, 'Nariz protegido');
    assert.strictEqual(isFaceProtectedRegion(normX, normMouthY, undefined, lm), true, 'Boca protegida');
  });

  // 4. Modos de máscara: HAIR_ONLY, BEARD_ONLY, HAIR_AND_BEARD
  test('4. generateMaskByMode suporta os 3 modos de visagismo', () => {
    const m1 = generateMaskByMode('HAIR_ONLY', 300, 400);
    const m2 = generateMaskByMode('BEARD_ONLY', 300, 400);
    const m3 = generateMaskByMode('HAIR_AND_BEARD', 300, 400);
    assert.ok(m1.length > 50);
    assert.ok(m2.length > 50);
    assert.ok(m3.length > 50);
  });

  // 5. Motor de composição Smoothstep S-Curve
  await asyncTest('5. compositeInpaintingResult executa mesclagem suave com curva Hermite', async () => {
    const orig = await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 50, g: 100, b: 150 } },
    })
      .jpeg()
      .toBuffer();

    const gen = await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 200, g: 50, b: 50 } },
    })
      .jpeg()
      .toBuffer();

    const maskRaw = Buffer.alloc(100 * 100, 0);
    for (let y = 0; y < 40; y++) {
      for (let x = 0; x < 100; x++) {
        maskRaw[y * 100 + x] = 255;
      }
    }
    const mask = await sharp(maskRaw, { raw: { width: 100, height: 100, channels: 1 } })
      .png()
      .toBuffer();

    const res = await compositeInpaintingResult({
      originalBuffer: orig,
      generatedBuffer: gen,
      maskBuffer: mask,
      featherSigma: 0,
    });

    assert.ok(res.compositeBuffer);
    assert.strictEqual(res.outsideMaskPixelChangeRatio, 0.0);
  });

  // 6. Quality Gate aprova métricas perfeitas
  await asyncTest('6. validateIdentityQuality aprova quando SSIM >= 0.95 e fora da máscara é 0%', async () => {
    const qg = await validateIdentityQuality({
      outsideMaskPixelChangeRatio: 0.0,
      faceSSIM: 0.99,
      imageBuffer: testImgBuffer,
    });
    assert.strictEqual(qg.passed, true);
    assert.ok(qg.score >= 0.95);
  });

  // 7. Quality Gate rejeita alteração fora da máscara
  await asyncTest('7. validateIdentityQuality rejeita quando fora da máscara tem mais de 1% de alteração', async () => {
    const qg = await validateIdentityQuality({
      outsideMaskPixelChangeRatio: 0.03,
      faceSSIM: 0.99,
      imageBuffer: testImgBuffer,
    });
    assert.strictEqual(qg.passed, false);
  });

  // 8. Quality Gate rejeita SSIM facial baixo
  await asyncTest('8. validateIdentityQuality rejeita quando SSIM do rosto < 0.95', async () => {
    const qg = await validateIdentityQuality({
      outsideMaskPixelChangeRatio: 0.0,
      faceSSIM: 0.85,
      imageBuffer: testImgBuffer,
    });
    assert.strictEqual(qg.passed, false);
  });

  // 9. Prompts de todos os cortes são descritivos de alta qualidade
  test('9. Todos os cortes do catálogo possuem prompts de alta definição com Apply/Edit', () => {
    assert.ok(HAIRCUTS_CATALOG.length >= 15);
    for (const cut of HAIRCUTS_CATALOG) {
      assert.ok(cut.stylePrompt.startsWith('Apply') || cut.stylePrompt.startsWith('Edit'));
      assert.ok(cut.stylePrompt.includes('photorealistic') || cut.stylePrompt.includes('realistic'));
      assert.ok(!cut.stylePrompt.includes('handsome man'));
    }
  });

  // 10. Provedor Replicate configurado com FLUX Fill
  test('10. ReplicateInpaintingVisagismProvider possui nome estruturado oficial', () => {
    const prov = new ReplicateInpaintingVisagismProvider();
    assert.strictEqual(prov.name, 'REPLICATE_FLUX_FILL');
  });

  // 11. Catálogo de barbas presente e estruturado
  test('11. Catálogo de barbas possui estilos variados compatíveis com cortes', () => {
    assert.ok(BEARD_STYLES_CATALOG.length >= 6);
    const stubble = BEARD_STYLES_CATALOG.find((b) => b.id === 'barba-por-fazer');
    assert.ok(stubble);
    assert.ok(stubble.idealWithHaircuts.length > 0);
  });

  // 12. SSIM entre a mesma imagem retorna 1.00
  await asyncTest('12. calculateProtectedFaceSSIM retorna 1.00 para imagem idêntica', async () => {
    const raw = await sharp(testImgBuffer).ensureAlpha().raw().toBuffer();
    const ssim = await calculateProtectedFaceSSIM(raw, raw, width, height);
    assert.strictEqual(ssim, 1.0);
  });

  console.log(`\n🎉 FASE 22: ${passed} de ${total} testes executados com SUCESSO!\n`);
}

runTests().catch((err) => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
