import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { extractFaceLandmarks } from '../src/lib/visagism/face-landmarks.ts';
import { generateMaskByMode } from '../src/lib/visagism/mask.ts';
import { compositeInpaintingResult } from '../src/lib/visagism/composite.ts';
import { validateIdentityQuality } from '../src/lib/visagism/gate.ts';
import { validateIdentityGate } from '../src/lib/visagism/identity-gate.ts';
import { HAIRCUTS_CATALOG } from '../src/lib/visagism/catalog.ts';

async function runSimulation() {
  console.log('============================================================');
  console.log('🧪 BARBERFLOW — SIMULAÇÃO E AUDITORIA VISUAL DE VISAGISMO');
  console.log('============================================================\n');

  const testDir = path.join(process.cwd(), 'storage', 'visagismo', 'test');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  // 1. Gera imagem base de teste de alta qualidade (600x800 com feições faciais)
  const width = 600;
  const height = 800;

  // Cria imagem sintética realista com fundo, corpo e tom de pele facial
  const baseImg = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 215, g: 170, b: 140 }, // Tom de pele
    },
  })
    .composite([
      // Fundo superior
      {
        input: Buffer.from(
          `<svg width="${width}" height="${height}">
            <rect width="${width}" height="${height * 0.25}" fill="#18181b"/>
            <circle cx="${width / 2}" cy="${height * 0.45}" r="${width * 0.35}" fill="#d7aa8c"/>
            <ellipse cx="${width * 0.38}" cy="${height * 0.40}" rx="18" ry="10" fill="#27272a"/>
            <ellipse cx="${width * 0.62}" cy="${height * 0.40}" rx="18" ry="10" fill="#27272a"/>
            <polygon points="${width / 2},${height * 0.45} ${width * 0.47},${height * 0.54} ${width * 0.53},${height * 0.54}" fill="#c49075"/>
            <ellipse cx="${width / 2}" cy="${height * 0.65}" rx="35" ry="12" fill="#a85555"/>
          </svg>`
        ),
        top: 0,
        left: 0,
      },
    ])
    .jpeg({ quality: 95 })
    .toBuffer();

  console.log('1. Imagem base de teste gerada com sucesso.');

  // 2. Extração de Marcos Faciais
  console.log('2. Extraindo marcos faciais anatômicos...');
  const landmarks = await extractFaceLandmarks(baseImg, width, height);
  console.log(`   Confiança: ${(landmarks.confidence * 100).toFixed(1)}%`);
  console.log(`   Caixa Facial: [x: ${landmarks.faceBox.x}, y: ${landmarks.faceBox.y}, w: ${landmarks.faceBox.width}, h: ${landmarks.faceBox.height}]`);
  console.log(`   Hairline Y: ${landmarks.hairline.centerHairlineY}`);
  console.log(`   Olhos Y: ${landmarks.leftEye.centerY}, Boca Y: ${landmarks.mouth.centerY}`);

  // 3. Teste de Simulação para Modos de Máscara (HAIR_ONLY, BEARD_ONLY, HAIR_AND_BEARD)
  const modes = ['HAIR_ONLY', 'BEARD_ONLY', 'HAIR_AND_BEARD'] as const;

  for (const mode of modes) {
    console.log(`\n3. Testando modo: ${mode}`);
    const maskBuffer = generateMaskByMode(mode, width, height, undefined, landmarks);
    const maskPath = path.join(testDir, `simulation_mask_${mode.toLowerCase()}.png`);
    fs.writeFileSync(maskPath, maskBuffer);
    console.log(`   Máscara salva em: ${maskPath}`);

    // Cria imagem gerada simulada (novo estilo de cabelo / barba)
    const simulatedGenerated = await sharp(baseImg)
      .tint(mode === 'BEARD_ONLY' ? { r: 60, g: 45, b: 35 } : { r: 35, g: 30, b: 30 })
      .jpeg({ quality: 95 })
      .toBuffer();

    // 4. Executa Composição Smoothstep
    const compResult = await compositeInpaintingResult({
      originalBuffer: baseImg,
      generatedBuffer: simulatedGenerated,
      maskBuffer,
      faceBox: landmarks.faceBox,
      featherSigma: 3.5,
      mode,
    });

    const outPath = path.join(testDir, `simulation_composite_${mode.toLowerCase()}.jpg`);
    fs.writeFileSync(outPath, compResult.compositeBuffer);

    console.log(`   Composição concluída: ${outPath}`);
    console.log(`   Fora da Máscara (% alteração): ${(compResult.outsideMaskPixelChangeRatio * 100).toFixed(4)}%`);
    console.log(`   SSIM no Núcleo Facial: ${(compResult.faceSSIM * 100).toFixed(2)}%`);

    // 5. Validação com Gate de Qualidade
    const qualityGate = await validateIdentityQuality({
      imageBuffer: compResult.compositeBuffer,
      originalImageBuffer: baseImg,
      outsideMaskPixelChangeRatio: compResult.outsideMaskPixelChangeRatio,
      faceSSIM: compResult.faceSSIM,
    });

    if (!qualityGate.passed) {
      throw new Error(`Falha no Quality Gate para modo ${mode}: ${qualityGate.reason}`);
    }
    console.log(`   ✅ Quality Gate APROVADO! Score: ${(qualityGate.score * 100).toFixed(1)}%`);
  }

  // 6. Teste de integridade de todos os 18 cortes do catálogo
  console.log('\n4. Verificando prompts de alta definição de todos os cortes do catálogo...');
  for (const cut of HAIRCUTS_CATALOG) {
    if (!cut.stylePrompt.includes('Apply') && !cut.stylePrompt.includes('Edit')) {
      throw new Error(`Corte ${cut.id} possui prompt fora do padrão de edição.`);
    }
  }
  console.log(`   ✅ Todos os ${HAIRCUTS_CATALOG.length} cortes validados com sucesso!`);

  console.log('\n============================================================');
  console.log('🎉 TODAS AS SIMULAÇÕES DE VISAGISMO FORAM CONCLUÍDAS COM SUCESSO!');
  console.log('============================================================');
}

runSimulation().catch((err) => {
  console.error('❌ Erro na simulação:', err);
  process.exit(1);
});
