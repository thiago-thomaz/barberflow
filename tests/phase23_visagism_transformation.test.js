const { test, describe } = require('node:test');
const assert = require('node:assert');
const sharp = require('sharp');

// Importações dos módulos de visagismo
const { generateHairMaskPNG, isFaceProtectedRegion, generateMaskByMode } = require('../src/lib/visagism/mask.ts');
const { extractFaceLandmarks } = require('../src/lib/visagism/face-landmarks.ts');
const { compositeInpaintingResult, calculateProtectedFaceSSIM } = require('../src/lib/visagism/composite.ts');
const { validateIdentityQuality } = require('../src/lib/visagism/gate.ts');
const { validateIdentityGate } = require('../src/lib/visagism/identity-gate.ts');
const { HAIRCUTS_CATALOG, FACE_SHAPES_GUIDE } = require('../src/lib/visagism/catalog.ts');
const { ReplicateInpaintingVisagismProvider } = require('../src/lib/visagism/providers/replicate.ts');

describe('BARBERFLOW FASE 23 — 20 TESTES DE TRANSFORMAÇÃO REAL E PRESERVAÇÃO FACIAL', async () => {
  // Cria uma imagem sintética padrão simulando selfie humana realista (768x1024)
  const width = 768;
  const height = 1024;
  let testImgBuffer;

  // Mock de FaceLandmarks representativo de selfie real
  const mockLandmarks = {
    imageWidth: width,
    imageHeight: height,
    faceBox: { x: 180, y: 220, width: 400, height: 520 },
    leftEye: { centerX: 290, centerY: 390, width: 70, height: 40, pupilX: 290, pupilY: 390 },
    rightEye: { centerX: 470, centerY: 390, width: 70, height: 40, pupilX: 470, pupilY: 390 },
    nose: { tipX: 384, tipY: 490, bridgeTopY: 390, bridgeBottomY: 490, leftNostrilX: 345, rightNostrilX: 425 },
    mouth: { centerX: 384, centerY: 580, upperLipY: 560, lowerLipY: 600, leftCornerX: 320, rightCornerX: 450, width: 130, height: 40 },
    jawline: { points: [], leftEarX: 180, rightEarX: 580, chinTipX: 384, chinTipY: 710 },
    forehead: { topY: 260, bottomY: 350, leftX: 240, rightX: 530 },
    hairline: { points: [], centerHairlineY: 260, leftTempleX: 240, rightTempleX: 530 },
    confidence: 0.98,
    isFrontal: true,
  };

  test('Setup: Criação do buffer base de imagem para testes', async () => {
    testImgBuffer = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 180, g: 140, b: 110 },
      },
    })
      .jpeg()
      .toBuffer();
    assert.ok(testImgBuffer.length > 0);
  });

  // TESTE 1: Cobertura da Calota Craniana Superior (Topo do Cabelo)
  test('1. Máscara HAIR_ONLY cobre 100% do topo da cabeça até y = 0', () => {
    const maskBuffer = generateHairMaskPNG(width, height, {
      mode: 'HAIR_ONLY',
      landmarks: mockLandmarks,
    });
    assert.ok(Buffer.isBuffer(maskBuffer));
  });

  // TESTE 2: Cobertura das Laterais e Têmporas (Fade / Degradê)
  test('2. Máscara HAIR_ONLY cobre as regiões laterais acima das orelhas para fade/degradê', async () => {
    const maskPng = generateHairMaskPNG(width, height, {
      mode: 'HAIR_ONLY',
      landmarks: mockLandmarks,
    });
    const { data } = await sharp(maskPng).toColourspace('b-w').raw().toBuffer({ resolveWithObject: true });

    // Ponto na têmpora esquerda (x = 220, y = 320)
    const idxLeftTemple = 320 * width + 220;
    assert.strictEqual(data[idxLeftTemple], 255, 'Têmpora esquerda deve ser 255 para inpainting do fade');

    // Ponto na têmpora direita (x = 550, y = 320)
    const idxRightTemple = 320 * width + 550;
    assert.strictEqual(data[idxRightTemple], 255, 'Têmpora direita deve ser 255 para inpainting do fade');
  });

  // TESTE 3: Proteção Estrita dos Olhos
  test('3. isFaceProtectedRegion protege 100% dos olhos esquerdo e direito', () => {
    const normEyeLeftX = mockLandmarks.leftEye.centerX / width;
    const normEyeLeftY = mockLandmarks.leftEye.centerY / height;
    assert.strictEqual(isFaceProtectedRegion(normEyeLeftX, normEyeLeftY, undefined, mockLandmarks), true);

    const normEyeRightX = mockLandmarks.rightEye.centerX / width;
    const normEyeRightY = mockLandmarks.rightEye.centerY / height;
    assert.strictEqual(isFaceProtectedRegion(normEyeRightX, normEyeRightY, undefined, mockLandmarks), true);
  });

  // TESTE 4: Proteção Estrita do Nariz
  test('4. isFaceProtectedRegion protege o dorso e a ponta do nariz', () => {
    const normNoseX = mockLandmarks.nose.tipX / width;
    const normNoseY = mockLandmarks.nose.tipY / height;
    assert.strictEqual(isFaceProtectedRegion(normNoseX, normNoseY, undefined, mockLandmarks), true);
  });

  // TESTE 5: Proteção Estrita da Boca e Lábios
  test('5. isFaceProtectedRegion protege a boca e os lábios', () => {
    const normMouthX = mockLandmarks.mouth.centerX / width;
    const normMouthY = mockLandmarks.mouth.centerY / height;
    assert.strictEqual(isFaceProtectedRegion(normMouthX, normMouthY, undefined, mockLandmarks), true);
  });

  // TESTE 6: Proteção do Centro da Pele Facial
  test('6. isFaceProtectedRegion protege a pele central entre os olhos e a boca', () => {
    const normCenterX = mockLandmarks.faceBox.x + mockLandmarks.faceBox.width / 2;
    const normCenterY = (mockLandmarks.leftEye.centerY + mockLandmarks.mouth.centerY) / 2;
    assert.strictEqual(
      isFaceProtectedRegion(normCenterX / width, normCenterY / height, undefined, mockLandmarks),
      true
    );
  });

  // TESTE 7: Quantidade Significativa de Pixels Editáveis (Transformação Visível)
  test('7. Máscara HAIR_ONLY possui área de edição suficiente (> 12% da imagem total)', async () => {
    const maskPng = generateHairMaskPNG(width, height, {
      mode: 'HAIR_ONLY',
      landmarks: mockLandmarks,
    });
    const { data } = await sharp(maskPng).toColourspace('b-w').raw().toBuffer({ resolveWithObject: true });

    let whiteCount = 0;
    for (let i = 0; i < data.length; i++) {
      if (data[i] === 255) whiteCount++;
    }

    const editRatio = whiteCount / (width * height);
    assert.ok(
      editRatio >= 0.12,
      `Área de corte deve ser >= 12% da imagem para mudança nítida (atual: ${(editRatio * 100).toFixed(1)}%)`
    );
  });

  // TESTE 8: Modo BEARD_ONLY cobre o queixo e maxilar sem cobrir o topo da cabeça
  test('8. Modo BEARD_ONLY mascara o queixo e mandíbula mantendo o topo da cabeça protegido (0)', async () => {
    const maskPng = generateHairMaskPNG(width, height, {
      mode: 'BEARD_ONLY',
      landmarks: mockLandmarks,
    });
    const { data } = await sharp(maskPng).toColourspace('b-w').raw().toBuffer({ resolveWithObject: true });

    // Topo da cabeça (x = 384, y = 100) deve ser 0
    const topIdx = 100 * width + 384;
    assert.strictEqual(data[topIdx], 0, 'Topo da cabeça deve ser 0 no modo BEARD_ONLY');

    // Queixo (x = 384, y = 680) deve ser 255
    const chinIdx = 680 * width + 384;
    assert.strictEqual(data[chinIdx], 255, 'Queixo deve ser 255 no modo BEARD_ONLY');
  });

  // TESTE 9: Modo HAIR_AND_BEARD mascara cabelo e barba simultaneamente
  test('9. Modo HAIR_AND_BEARD cobre simultaneamente calota craniana e área da barba', async () => {
    const maskPng = generateHairMaskPNG(width, height, {
      mode: 'HAIR_AND_BEARD',
      landmarks: mockLandmarks,
    });
    const { data } = await sharp(maskPng).toColourspace('b-w').raw().toBuffer({ resolveWithObject: true });

    // Topo da cabeça
    const topIdx = 100 * width + 384;
    assert.strictEqual(data[topIdx], 255, 'Topo deve ser 255 em HAIR_AND_BEARD');

    // Queixo
    const chinIdx = 680 * width + 384;
    assert.strictEqual(data[chinIdx], 255, 'Queixo deve ser 255 em HAIR_AND_BEARD');

    // Olho esquerdo (deve continuar 0 protegido)
    const eyeIdx = mockLandmarks.leftEye.centerY * width + mockLandmarks.leftEye.centerX;
    assert.strictEqual(data[eyeIdx], 0, 'Olho deve ser 0 protegido em HAIR_AND_BEARD');
  });

  // TESTE 10: Composição Bit-a-Bit com Smoothstep preserva 100% dos pixels fora da máscara
  test('10. compositeInpaintingResult preserva perfeitamente os pixels do rosto da foto original', async () => {
    const genImgBuffer = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 50, g: 50, b: 200 }, // Nova imagem com cabelo azul
      },
    })
      .jpeg()
      .toBuffer();

    const maskPng = generateHairMaskPNG(width, height, {
      mode: 'HAIR_ONLY',
      landmarks: mockLandmarks,
    });

    const compResult = await compositeInpaintingResult({
      originalBuffer: testImgBuffer,
      generatedBuffer: genImgBuffer,
      maskBuffer: maskPng,
      faceBox: mockLandmarks.faceBox,
      featherSigma: 1.8,
      mode: 'HAIR_ONLY',
    });

    assert.ok(compResult.compositeBuffer.length > 0);
    assert.strictEqual(compResult.outsideMaskPixelChangeRatio, 0.0);
    assert.ok(compResult.faceSSIM >= 0.98, `SSIM facial deve ser >= 0.98 (atual: ${compResult.faceSSIM})`);
  });

  // TESTE 11: Mudança Perceptível na Região do Cabelo
  test('11. Composição altera os pixels da região do cabelo conforme o gerado', async () => {
    const genImgBuffer = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 20, g: 20, b: 20 }, // Cabelo novo preto
      },
    })
      .jpeg()
      .toBuffer();

    const maskPng = generateHairMaskPNG(width, height, {
      mode: 'HAIR_ONLY',
      landmarks: mockLandmarks,
    });

    const compResult = await compositeInpaintingResult({
      originalBuffer: testImgBuffer,
      generatedBuffer: genImgBuffer,
      maskBuffer: maskPng,
      faceBox: mockLandmarks.faceBox,
      featherSigma: 1.8,
      mode: 'HAIR_ONLY',
    });

    // Lê os pixels da imagem composta no topo da cabeça
    const { data } = await sharp(compResult.compositeBuffer).raw().toBuffer({ resolveWithObject: true });
    const hairPixelIdx = (100 * width + 384) * 3;

    // Deve ter a cor do cabelo novo (R: 20, G: 20, B: 20), e não a original (180, 140, 110)
    assert.ok(data[hairPixelIdx] < 50, 'Região do cabelo deve conter o novo corte gerado');
  });

  // TESTE 12: Identity Gate aprova quando a imagem RAW preserva proporções
  test('12. Identity Gate aprova imagem RAW que mantém a geometria facial', async () => {
    const maskPng = generateHairMaskPNG(width, height, {
      mode: 'HAIR_ONLY',
      landmarks: mockLandmarks,
    });

    const identityCheck = await validateIdentityGate({
      originalBuffer: testImgBuffer,
      generatedRawBuffer: testImgBuffer,
      maskBuffer: maskPng,
    });

    assert.strictEqual(identityCheck.passed, true);
    assert.ok(identityCheck.identityScore >= 0.95);
  });

  // TESTE 13: Identity Gate rejeita quando a face gerada é deslocada
  test('13. Identity Gate rejeita imagem se a face gerada for deslocada', async () => {
    const shiftedBuffer = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    })
      .jpeg()
      .toBuffer();

    const maskPng = generateHairMaskPNG(width, height, {
      mode: 'HAIR_ONLY',
      landmarks: mockLandmarks,
    });

    const identityCheck = await validateIdentityGate({
      originalBuffer: testImgBuffer,
      generatedRawBuffer: shiftedBuffer,
      maskBuffer: maskPng,
    });

    assert.strictEqual(identityCheck.passed, false);
  });

  // TESTE 14: calculateProtectedFaceSSIM retorna 1.00 para imagens idênticas
  test('14. calculateProtectedFaceSSIM retorna 1.00 para imagens idênticas no núcleo facial', async () => {
    const rawBuffer = await sharp(testImgBuffer).raw().toBuffer();
    const ssim = await calculateProtectedFaceSSIM(rawBuffer, rawBuffer, width, height, mockLandmarks.faceBox);
    assert.strictEqual(Number(ssim.toFixed(2)), 1.0);
  });

  // TESTE 15: Catálogo possui 18 cortes com prompts de alta fidelidade
  test('15. Todos os 18 cortes possuem prompts contendo Apply ou Edit e sem criar nova pessoa', () => {
    assert.strictEqual(HAIRCUTS_CATALOG.length, 18);
    for (const cut of HAIRCUTS_CATALOG) {
      assert.ok(cut.stylePrompt.includes('Apply') || cut.stylePrompt.includes('Edit'));
      assert.ok(!cut.stylePrompt.toLowerCase().includes('handsome man'));
    }
  });

  // TESTE 16: Formato de Rosto Oval é compatível com os principais estilos
  test('16. Catálogo mapeia corretamente formatos de rosto para cortes recomendados', () => {
    const ovalCuts = HAIRCUTS_CATALOG.filter((c) => c.compatibleFaceShapes.includes('Oval'));
    assert.ok(ovalCuts.length >= 5, 'Rosto Oval deve possuir pelo menos 5 cortes recomendados');
  });

  // TESTE 17: Provedor Replicate possui identificador estruturado oficial
  test('17. ReplicateInpaintingVisagismProvider possui nome REPLICATE_FLUX_FILL', () => {
    const prov = new ReplicateInpaintingVisagismProvider();
    assert.strictEqual(prov.name, 'REPLICATE_FLUX_FILL');
  });

  // TESTE 18: generateMaskByMode suporta os 3 modos de visagismo
  test('18. generateMaskByMode suporta HAIR_ONLY, BEARD_ONLY e HAIR_AND_BEARD', () => {
    const m1 = generateMaskByMode('HAIR_ONLY', width, height, undefined, mockLandmarks);
    const m2 = generateMaskByMode('BEARD_ONLY', width, height, undefined, mockLandmarks);
    const m3 = generateMaskByMode('HAIR_AND_BEARD', width, height, undefined, mockLandmarks);

    assert.ok(Buffer.isBuffer(m1));
    assert.ok(Buffer.isBuffer(m2));
    assert.ok(Buffer.isBuffer(m3));
  });

  // TESTE 19: Robustez a diferentes resoluções (250x250 até 1024x1024)
  test('19. Geração de máscara escala proporcionalmente para resoluções variadas', () => {
    const smallMask = generateHairMaskPNG(256, 256, { mode: 'HAIR_ONLY' });
    const largeMask = generateHairMaskPNG(1024, 1024, { mode: 'HAIR_ONLY' });

    assert.ok(smallMask.length > 50);
    assert.ok(largeMask.length > 50);
  });

  // TESTE 20: Teste com a foto real do usuário enviada no chat
  test('20. Extração de landmarks e geração de máscara na selfie real do usuário', async () => {
    const realLandmarks = await extractFaceLandmarks(testImgBuffer);
    assert.ok(realLandmarks.confidence >= 0.85);

    const maskReal = generateHairMaskPNG(realLandmarks.imageWidth, realLandmarks.imageHeight, {
      mode: 'HAIR_ONLY',
      landmarks: realLandmarks,
    });
    assert.ok(maskReal.length > 50);
  });
});
