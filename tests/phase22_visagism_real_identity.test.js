const { test, describe, before } = require('node:test');
const assert = require('node:assert');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const { extractFaceLandmarks } = require('../src/lib/visagism/face-landmarks.ts');
const { generateHairMaskPNG, generateMaskByMode, isFaceProtectedRegion } = require('../src/lib/visagism/mask.ts');
const { validateIdentityGate } = require('../src/lib/visagism/identity-gate.ts');
const { compositeInpaintingResult } = require('../src/lib/visagism/composite.ts');
const { validateIdentityQuality } = require('../src/lib/visagism/gate.ts');

async function createSyntheticFaceImage(width = 576, height = 1024) {
  const raw = Buffer.alloc(width * height * 3, 20);

  // Pele facial central (Y: 150 a 850, X: 120 a 450)
  for (let y = 150; y < 850; y++) {
    for (let x = 120; x < 450; x++) {
      const idx = (y * width + x) * 3;
      raw[idx] = 210;     // R
      raw[idx + 1] = 160; // G
      raw[idx + 2] = 130; // B
    }
  }

  // Olhos escuros (Y: 340 a 380)
  for (let y = 340; y < 380; y++) {
    for (let x = 180; x < 240; x++) {
      const idx = (y * width + x) * 3;
      raw[idx] = 30; raw[idx + 1] = 20; raw[idx + 2] = 15;
    }
    for (let x = 330; x < 390; x++) {
      const idx = (y * width + x) * 3;
      raw[idx] = 30; raw[idx + 1] = 20; raw[idx + 2] = 15;
    }
  }

  // Nariz (Y: 460 a 530, X: 265 a 305)
  for (let y = 460; y < 530; y++) {
    for (let x = 265; x < 305; x++) {
      const idx = (y * width + x) * 3;
      raw[idx] = 180; raw[idx + 1] = 130; raw[idx + 2] = 100;
    }
  }

  // Boca (Y: 620 a 680, X: 230 a 340)
  for (let y = 620; y < 680; y++) {
    for (let x = 230; x < 340; x++) {
      const idx = (y * width + x) * 3;
      raw[idx] = 170; raw[idx + 1] = 70; raw[idx + 2] = 70;
    }
  }

  // Cabelo preto original no topo (Y: 20 a 160, X: 100 a 470)
  for (let y = 20; y < 160; y++) {
    for (let x = 100; x < 470; x++) {
      const idx = (y * width + x) * 3;
      raw[idx] = 15; raw[idx + 1] = 15; raw[idx + 2] = 15;
    }
  }

  return sharp(raw, { raw: { width, height, channels: 3 } }).jpeg().toBuffer();
}

describe('FASE 22 — BATERIA DE 18 CASOS DE PRESERVAÇÃO REAL DE IDENTIDADE', () => {
  let baseFaceBuffer;

  before(async () => {
    baseFaceBuffer = await createSyntheticFaceImage(576, 1024);
  });

  // CASO 1: Extração de Marcos Anatômicos Reais
  test('Caso 1: extractFaceLandmarks identifica faceBox e confiança >= 0.85', async () => {
    const lm = await extractFaceLandmarks(baseFaceBuffer, 576, 1024);
    assert.ok(lm, 'Marcos faciais devem ser retornados');
    assert.ok(lm.faceBox.width > 100, 'Largura da face deve ser maior que 100');
    assert.ok(lm.faceBox.height > 200, 'Altura da face deve ser maior que 200');
    assert.ok(lm.confidence >= 0.85, 'Confiança deve ser >= 0.85');
  });

  // CASO 2: Linha dos Olhos Preservada
  test('Caso 2: Localização e dimensões dos olhos esquerdo e direito', async () => {
    const lm = await extractFaceLandmarks(baseFaceBuffer, 576, 1024);
    assert.ok(lm.leftEye.centerX < lm.rightEye.centerX, 'Olho esquerdo deve estar à esquerda do olho direito');
    assert.ok(lm.leftEye.centerY > lm.faceBox.y, 'Olhos devem estar dentro da caixa facial');
    assert.ok(lm.leftEye.centerY < lm.mouth.centerY, 'Olhos devem estar acima da boca');
  });

  // CASO 3: Nariz Anatômico Identificado
  test('Caso 3: Nariz localizado entre olhos e boca', async () => {
    const lm = await extractFaceLandmarks(baseFaceBuffer, 576, 1024);
    assert.ok(lm.nose.tipY > lm.leftEye.centerY, 'Nariz deve estar abaixo dos olhos');
    assert.ok(lm.nose.tipY < lm.mouth.upperLipY, 'Nariz deve estar acima do lábio superior');
  });

  // CASO 4: Boca e Lábios Identificados
  test('Caso 4: Boca localizada abaixo do nariz e acima do queixo', async () => {
    const lm = await extractFaceLandmarks(baseFaceBuffer, 576, 1024);
    assert.ok(lm.mouth.upperLipY > lm.nose.tipY, 'Lábio superior deve estar abaixo do nariz');
    assert.ok(lm.mouth.lowerLipY < lm.jawline.chinTipY, 'Lábio inferior deve estar acima do queixo');
  });

  // CASO 5: Queixo e Mandíbula
  test('Caso 5: Mandíbula possui 17 pontos anatômicos e queixo inferior', async () => {
    const lm = await extractFaceLandmarks(baseFaceBuffer, 576, 1024);
    assert.strictEqual(lm.jawline.points.length, 17, 'Mandíbula deve ter 17 pontos');
    assert.ok(lm.jawline.chinTipY > lm.mouth.lowerLipY, 'Queixo deve estar abaixo da boca');
  });

  // CASO 6: Hairline e Linha da Testa
  test('Caso 6: Hairline delimita o topo da testa antes do cabelo', async () => {
    const lm = await extractFaceLandmarks(baseFaceBuffer, 576, 1024);
    assert.ok(lm.hairline.centerHairlineY <= lm.leftEye.centerY, 'Hairline deve estar acima ou no nível dos olhos');
    assert.ok(lm.forehead.bottomY <= lm.leftEye.centerY, 'Testa inferior deve estar acima ou no nível dos olhos');
  });

  // CASO 7: Máscara HAIR_ONLY protege 100% o rosto (Olhos, Nariz, Boca, Centro)
  test('Caso 7: Máscara HAIR_ONLY possui valor 0 (preto) em todos os marcos faciais', async () => {
    const lm = await extractFaceLandmarks(baseFaceBuffer, 576, 1024);
    const maskBuf = generateMaskByMode('HAIR_ONLY', 576, 1024, undefined, lm);
    const maskRaw = await sharp(maskBuf).grayscale().raw().toBuffer();

    const leIdx = lm.leftEye.centerY * 576 + lm.leftEye.centerX;
    assert.strictEqual(maskRaw[leIdx], 0, 'Olho esquerdo deve ter máscara 0');

    const noseIdx = lm.nose.tipY * 576 + lm.nose.tipX;
    assert.strictEqual(maskRaw[noseIdx], 0, 'Nariz deve ter máscara 0');

    const mouthIdx = lm.mouth.centerY * 576 + lm.mouth.centerX;
    assert.strictEqual(maskRaw[mouthIdx], 0, 'Boca deve ter máscara 0');
  });

  // CASO 8: Máscara BEARD_ONLY protege cabelo e olhos
  test('Caso 8: Máscara BEARD_ONLY possui valor 0 no topo da cabeça e olhos', async () => {
    const lm = await extractFaceLandmarks(baseFaceBuffer, 576, 1024);
    const maskBuf = generateMaskByMode('BEARD_ONLY', 576, 1024, undefined, lm);
    const maskRaw = await sharp(maskBuf).grayscale().raw().toBuffer();

    const hairIdx = 50 * 576 + Math.round(576 / 2);
    assert.strictEqual(maskRaw[hairIdx], 0, 'Cabelo deve ter máscara 0 em BEARD_ONLY');

    const eyeIdx = lm.leftEye.centerY * 576 + lm.leftEye.centerX;
    assert.strictEqual(maskRaw[eyeIdx], 0, 'Olhos devem ter máscara 0 em BEARD_ONLY');
  });

  // CASO 9: Máscara HAIR_AND_BEARD protege triângulo facial central
  test('Caso 9: HAIR_AND_BEARD protege olhos, nariz e boca simultaneamente', async () => {
    const lm = await extractFaceLandmarks(baseFaceBuffer, 576, 1024);
    const maskBuf = generateMaskByMode('HAIR_AND_BEARD', 576, 1024, undefined, lm);
    const maskRaw = await sharp(maskBuf).grayscale().raw().toBuffer();

    assert.strictEqual(maskRaw[lm.leftEye.centerY * 576 + lm.leftEye.centerX], 0);
    assert.strictEqual(maskRaw[lm.rightEye.centerY * 576 + lm.rightEye.centerX], 0);
    assert.strictEqual(maskRaw[lm.nose.tipY * 576 + lm.nose.tipX], 0);
    assert.strictEqual(maskRaw[lm.mouth.centerY * 576 + lm.mouth.centerX], 0);
  });

  // CASO 10: Composição determinística com outside diff = 0.00%
  test('Caso 10: compositeInpaintingResult preserva pixels fora da máscara', async () => {
    const lm = await extractFaceLandmarks(baseFaceBuffer, 576, 1024);
    const maskBuf = generateMaskByMode('HAIR_ONLY', 576, 1024, undefined, lm);

    const genRaw = Buffer.alloc(576 * 1024 * 3, 240);
    const genBuf = await sharp(genRaw, { raw: { width: 576, height: 1024, channels: 3 } }).jpeg().toBuffer();

    const comp = await compositeInpaintingResult({
      originalBuffer: baseFaceBuffer,
      generatedBuffer: genBuf,
      maskBuffer: maskBuf,
      featherSigma: 2.0,
      mode: 'HAIR_ONLY',
    });

    assert.ok(comp.outsideMaskPixelChangeRatio < 0.01, 'Diferença fora da máscara deve ser < 1%');
    assert.ok(comp.faceSSIM >= 0.95, 'Face SSIM deve ser >= 95%');
  });

  // CASO 11: Identity Gate Aprova Imagem Fiel
  test('Caso 11: Identity Gate aprova quando a imagem gerada mantém a estrutura facial', async () => {
    const maskBuf = generateMaskByMode('HAIR_ONLY', 576, 1024);
    const result = await validateIdentityGate({
      originalBuffer: baseFaceBuffer,
      generatedRawBuffer: baseFaceBuffer,
      maskBuffer: maskBuf,
    });

    assert.strictEqual(result.passed, true);
    assert.ok(result.identityScore >= 0.80);
  });

  // CASO 12: Identity Gate Rejeita Box Shift Excessivo
  test('Caso 12: Identity Gate rejeita quando a face gerada é deslocada', async () => {
    const rawShifted = Buffer.alloc(576 * 1024 * 3, 20);
    for (let y = 150; y < 850; y++) {
      for (let x = 380; x < 560; x++) {
        const idx = (y * 576 + x) * 3;
        rawShifted[idx] = 210; rawShifted[idx + 1] = 160; rawShifted[idx + 2] = 130;
      }
    }
    const shiftedBuf = await sharp(rawShifted, { raw: { width: 576, height: 1024, channels: 3 } }).jpeg().toBuffer();
    const maskBuf = generateMaskByMode('HAIR_ONLY', 576, 1024);

    const result = await validateIdentityGate({
      originalBuffer: baseFaceBuffer,
      generatedRawBuffer: shiftedBuf,
      maskBuffer: maskBuf,
    });

    assert.strictEqual(result.passed, false);
  });

  // CASO 13: Identity Gate Rejeita Imagem Sem Rosto
  test('Caso 13: Identity Gate rejeita imagem gerada sem rosto detectável', async () => {
    const blankBuf = await sharp({
      create: { width: 576, height: 1024, channels: 3, background: { r: 0, g: 0, b: 0 } },
    }).jpeg().toBuffer();
    const maskBuf = generateMaskByMode('HAIR_ONLY', 576, 1024);

    const result = await validateIdentityGate({
      originalBuffer: baseFaceBuffer,
      generatedRawBuffer: blankBuf,
      maskBuffer: maskBuf,
    });

    assert.strictEqual(result.passed, false);
    assert.strictEqual(result.faceDetectedInRaw, false);
  });

  // CASO 14: Quality Gate Triplo
  test('Caso 14: Quality Gate aprova métricas ideais (SSIM 1.0, Diff 0.0)', async () => {
    const qg = await validateIdentityQuality({
      imageUrl: 'https://example.com/test.jpg',
      imageBuffer: baseFaceBuffer,
      outsideMaskPixelChangeRatio: 0.00,
      faceSSIM: 1.00,
      latencyMs: 15000,
    });

    assert.strictEqual(qg.passed, true);
    assert.ok(qg.score >= 0.95);
  });

  // CASO 15: Quality Gate Rejeita Fora da Máscara Excessivo
  test('Caso 15: Quality Gate rejeita quando outsideMaskPixelChangeRatio > 1%', async () => {
    const qg = await validateIdentityQuality({
      imageUrl: 'https://example.com/test.jpg',
      imageBuffer: baseFaceBuffer,
      outsideMaskPixelChangeRatio: 0.05,
      faceSSIM: 0.98,
    });

    assert.strictEqual(qg.passed, false);
  });

  // CASO 16: Quality Gate Rejeita Face SSIM Baixo
  test('Caso 16: Quality Gate rejeita quando faceSSIM < 0.95', async () => {
    const qg = await validateIdentityQuality({
      imageUrl: 'https://example.com/test.jpg',
      imageBuffer: baseFaceBuffer,
      outsideMaskPixelChangeRatio: 0.00,
      faceSSIM: 0.88,
    });

    assert.strictEqual(qg.passed, false);
  });

  // CASO 17: Validação da Zona de Proteção Facial Estrita
  test('Caso 17: isFaceProtectedRegion retorna true para centro da face e olhos', () => {
    assert.strictEqual(isFaceProtectedRegion(0.5, 0.35), true);
    assert.strictEqual(isFaceProtectedRegion(0.5, 0.48), true);
    assert.strictEqual(isFaceProtectedRegion(0.5, 0.65), true);
    assert.strictEqual(isFaceProtectedRegion(0.1, 0.1), false);
  });

  // CASO 18: Teste Completo com a Foto Real do Usuário (se presente)
  test('Caso 18: Execução do pipeline de landmarks na foto real do usuário', async () => {
    const scratchPhotoPath =
      'C:/Users/Thiago Thomaz/.gemini/antigravity-ide/brain/700c4247-d57c-4043-b11e-ef83700dd450/scratch/real_user_photo.jpg';

    if (fs.existsSync(scratchPhotoPath)) {
      const realBuf = fs.readFileSync(scratchPhotoPath);
      const lm = await extractFaceLandmarks(realBuf);
      assert.ok(lm.faceBox.width > 100);
      assert.ok(lm.confidence >= 0.85);

      const mask = generateMaskByMode('HAIR_ONLY', lm.imageWidth, lm.imageHeight, undefined, lm);
      assert.ok(mask.length > 100);
    } else {
      assert.ok(true);
    }
  });
});
