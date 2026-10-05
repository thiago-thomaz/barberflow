const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const { extractFaceLandmarks } = require('../src/lib/visagism/face-landmarks.ts');
const { generateMaskByMode } = require('../src/lib/visagism/mask.ts');
const { compositeInpaintingResult } = require('../src/lib/visagism/composite.ts');
const { replicateImageProvider } = require('../src/lib/visagism/providers/replicate.ts');
const { validateIdentityQuality } = require('../src/lib/visagism/gate.ts');
const { HAIRCUTS_CATALOG } = require('../src/lib/visagism/catalog.ts');

async function testFullLiveGeneration() {
  console.log('=== TESTE DE TRANSFORMAÇÃO REAL DE VISAGISMO ===');

  const origBuf = fs.readFileSync('storage/test_replicate_lowfade.jpg');
  const meta = await sharp(origBuf).metadata();
  const width = meta.width;
  const height = meta.height;

  console.log('1. Imagem do usuário:', width, 'x', height);

  // 1. Extração de marcos faciais
  const landmarks = await extractFaceLandmarks(origBuf, width, height);
  console.log('2. Marcos extraídos com sucesso:', {
    leftEye: landmarks.leftEye.centerX,
    rightEye: landmarks.rightEye.centerX,
    hairlineY: landmarks.hairline.centerHairlineY,
    confidence: landmarks.confidence,
  });

  // 2. Geração da máscara anatômica precisa
  const maskBuffer = generateMaskByMode('HAIR_ONLY', width, height, undefined, landmarks);
  fs.writeFileSync('storage/verified_mask.png', maskBuffer);
  console.log('3. Máscara gerada e salva em storage/verified_mask.png');

  // 3. Execução da IA com corte High Fade
  const haircut = HAIRCUTS_CATALOG.find(h => h.id === 'high-fade') || HAIRCUTS_CATALOG[0];
  console.log(`4. Executando geração FLUX.1 Fill para: ${haircut.name}...`);

  const genResult = await replicateImageProvider.generatePreview({
    originalImageBuffer: origBuf,
    originalImageMimeType: 'image/jpeg',
    maskBuffer,
    maskMode: 'HAIR_ONLY',
    stylePrompt: haircut.stylePrompt,
    negativePrompt: haircut.negativePrompt,
    landmarks,
  });

  if (!genResult || !genResult.finalCompositeBuffer) {
    throw new Error('Falha na geração Replicate.');
  }

  console.log('5. Geração concluída com sucesso!');
  console.log('   Latency:', genResult.latencyMs, 'ms');
  console.log('   Outside Mask Pixel Change Ratio:', genResult.outsideMaskPixelChangeRatio);
  console.log('   Face SSIM:', genResult.faceSSIM);
  console.log('   Identity Score:', genResult.identityScore);

  fs.writeFileSync('storage/verified_output_composite.jpg', genResult.finalCompositeBuffer);

  // 4. Quality Gate
  const gateResult = await validateIdentityQuality({
    imageBuffer: genResult.finalCompositeBuffer,
    originalImageBuffer: origBuf,
    outsideMaskPixelChangeRatio: genResult.outsideMaskPixelChangeRatio,
    faceSSIM: genResult.faceSSIM,
    haircutName: haircut.name,
    latencyMs: genResult.latencyMs,
  });

  console.log('6. Quality Gate:', gateResult);
  if (!gateResult.passed) {
    throw new Error(`Quality Gate rejeitou: ${gateResult.reason}`);
  }

  // 5. Cria imagem Lado a Lado para validação visual humana
  const origResized = await sharp(origBuf).resize(400, 600, { fit: 'fill' }).toBuffer();
  const compResized = await sharp(genResult.finalCompositeBuffer).resize(400, 600, { fit: 'fill' }).toBuffer();

  const sideBySide = await sharp({
    create: {
      width: 820,
      height: 620,
      channels: 3,
      background: { r: 15, g: 15, b: 20 },
    },
  })
    .composite([
      { input: origResized, top: 10, left: 10 },
      { input: compResized, top: 10, left: 410 },
    ])
    .jpeg({ quality: 95 })
    .toBuffer();

  fs.writeFileSync('storage/side_by_side_verified.jpg', sideBySide);
  console.log('7. Comparativo Lado a Lado salvo em storage/side_by_side_verified.jpg');

  console.log('\n✅ PROCESSO 100% VALIDADO E OPERACIONAL!');
}

testFullLiveGeneration().catch(console.error);
