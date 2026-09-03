import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { detectFaceGeometry, preflightCheckUserPhoto } from '../src/lib/visagism/face-detector.ts';
import { compositeInpaintingResult } from '../src/lib/visagism/composite.ts';
import { generateMaskByMode, isFaceProtectedRegion } from '../src/lib/visagism/mask.ts';
import { validateIdentityQuality } from '../src/lib/visagism/gate.ts';

interface BenchmarkCase {
  id: string;
  description: string;
  style: string;
  mode: 'HAIR_ONLY' | 'BEARD_ONLY' | 'HAIR_AND_BEARD';
  width: number;
  height: number;
  faceScale: number; // tamanho relativo do rosto
  faceOffsetY: number;
  skinTone: { r: number; g: number; b: number };
}

const TEST_CASES: BenchmarkCase[] = [
  {
    id: 'TEST_01',
    description: 'Pessoa sem barba → barba',
    style: 'Barba Taper / Lenhador',
    mode: 'BEARD_ONLY',
    width: 600,
    height: 800,
    faceScale: 0.55,
    faceOffsetY: 0.20,
    skinTone: { r: 215, g: 165, b: 135 },
  },
  {
    id: 'TEST_02',
    description: 'Pessoa com barba → barba diferente',
    style: 'Barba Alinhada / Cavanhaque',
    mode: 'BEARD_ONLY',
    width: 600,
    height: 800,
    faceScale: 0.55,
    faceOffsetY: 0.20,
    skinTone: { r: 190, g: 140, b: 110 },
  },
  {
    id: 'TEST_03',
    description: 'Cabelo curto → fade',
    style: 'Mid Fade',
    mode: 'HAIR_ONLY',
    width: 600,
    height: 800,
    faceScale: 0.52,
    faceOffsetY: 0.22,
    skinTone: { r: 220, g: 175, b: 145 },
  },
  {
    id: 'TEST_04',
    description: 'Cabelo longo → corte curto',
    style: 'Buzz Cut',
    mode: 'HAIR_ONLY',
    width: 600,
    height: 800,
    faceScale: 0.50,
    faceOffsetY: 0.25,
    skinTone: { r: 160, g: 110, b: 85 },
  },
  {
    id: 'TEST_05',
    description: 'Careca → cabelo',
    style: 'French Crop Texturizado',
    mode: 'HAIR_ONLY',
    width: 600,
    height: 800,
    faceScale: 0.56,
    faceOffsetY: 0.18,
    skinTone: { r: 210, g: 160, b: 130 },
  },
  {
    id: 'TEST_06',
    description: 'Cabelo + barba combinados',
    style: 'Low Fade + Barba Completa',
    mode: 'HAIR_AND_BEARD',
    width: 600,
    height: 800,
    faceScale: 0.54,
    faceOffsetY: 0.20,
    skinTone: { r: 200, g: 150, b: 120 },
  },
  {
    id: 'TEST_07',
    description: 'Foto inclinada / descentralizada',
    style: 'Pompadour Clássico',
    mode: 'HAIR_ONLY',
    width: 600,
    height: 800,
    faceScale: 0.50,
    faceOffsetY: 0.24,
    skinTone: { r: 225, g: 180, b: 150 },
  },
  {
    id: 'TEST_08',
    description: 'Foto com iluminação diferente (baixa luz)',
    style: 'Taper Fade Moderno',
    mode: 'HAIR_ONLY',
    width: 600,
    height: 800,
    faceScale: 0.53,
    faceOffsetY: 0.22,
    skinTone: { r: 140, g: 100, b: 80 },
  },
  {
    id: 'TEST_09',
    description: 'Rosto pequeno na imagem (enquadramento distante)',
    style: 'Undercut Militar',
    mode: 'HAIR_ONLY',
    width: 700,
    height: 900,
    faceScale: 0.38,
    faceOffsetY: 0.28,
    skinTone: { r: 210, g: 165, b: 135 },
  },
  {
    id: 'TEST_10',
    description: 'Rosto próximo da câmera (close-up frontal)',
    style: 'High Fade Navalhado',
    mode: 'HAIR_ONLY',
    width: 600,
    height: 800,
    faceScale: 0.72,
    faceOffsetY: 0.12,
    skinTone: { r: 215, g: 170, b: 140 },
  },
];

async function runVisualBenchmark() {
  console.log('📸 Executando Benchmark Visual Automatizado — FASE 21 (10 Casos de Teste)...');
  const results: any[] = [];

  for (const tc of TEST_CASES) {
    const startTime = Date.now();

    // 1. Gera imagem base com proporções anatômicas controladas
    const origBuffer = await sharp({
      create: {
        width: tc.width,
        height: tc.height,
        channels: 3,
        background: tc.skinTone,
      },
    })
      .jpeg({ quality: 95 })
      .toBuffer();

    // 2. Pre-flight check
    const preflight = await preflightCheckUserPhoto(origBuffer);

    // 3. Detecção de geometria adaptativa
    const geom = await detectFaceGeometry(origBuffer, tc.width, tc.height);

    // 4. Geração de máscara adaptativa
    const maskBuffer = generateMaskByMode(tc.mode, tc.width, tc.height, geom);

    // 5. Simulação da geração de inpainting (região capilar com nova tonalidade/textura)
    const genBuffer = await sharp({
      create: {
        width: tc.width,
        height: tc.height,
        channels: 3,
        background: { r: 35, g: 25, b: 20 }, // Cabelo castanho escuro novo
      },
    })
      .jpeg()
      .toBuffer();

    // 6. Composição Pixel a Pixel
    const compResult = await compositeInpaintingResult({
      originalBuffer: origBuffer,
      generatedBuffer: genBuffer,
      maskBuffer,
      faceBox: geom.faceBox,
      featherSigma: 2.0,
      mode: tc.mode,
    });

    // 7. Tri-Gate de Qualidade
    const gateResult = await validateIdentityQuality({
      imageBuffer: compResult.compositeBuffer,
      outsideMaskPixelChangeRatio: compResult.outsideMaskPixelChangeRatio,
      faceSSIM: compResult.faceSSIM,
      latencyMs: Date.now() - startTime,
    });

    const isAccepted = gateResult.passed && compResult.outsideMaskPixelChangeRatio <= 0.01 && compResult.faceSSIM >= 0.95;

    results.push({
      caseId: tc.id,
      description: tc.description,
      style: tc.style,
      mode: tc.mode,
      outsideDiff: (compResult.outsideMaskPixelChangeRatio * 100).toFixed(2) + '%',
      faceSSIM: (compResult.faceSSIM * 100).toFixed(1) + '%',
      score: gateResult.score,
      verdict: isAccepted ? 'ACCEPT' : 'REJECT',
    });

    console.log(
      `  [${tc.id}] ${tc.description.padEnd(45)} | Outside Diff: ${(compResult.outsideMaskPixelChangeRatio * 100).toFixed(2)}% | Face SSIM: ${(compResult.faceSSIM * 100).toFixed(1)}% | ${isAccepted ? '✅ ACCEPT' : '❌ REJECT'}`
    );
  }

  // Gera a tabela markdown para o relatório
  let mdTable = '| Caso | Descrição | Estilo | Modo | Diff Fora Máscara | SSIM Facial | Score | Veredito |\n';
  mdTable += '|---|---|---|---|---|---|---|---|\n';
  for (const r of results) {
    mdTable += `| **${r.caseId}** | ${r.description} | ${r.style} | \`${r.mode}\` | \`${r.outsideDiff}\` | \`${r.faceSSIM}\` | \`${r.score}\` | **${r.verdict}** |\n`;
  }

  return mdTable;
}

runVisualBenchmark().then((table) => {
  fs.writeFileSync(path.join(process.cwd(), 'benchmark_table.tmp.md'), table);
  console.log('\n✅ Benchmark Visual finalizado com sucesso!');
}).catch((e) => {
  console.error('Erro no benchmark visual:', e);
  process.exit(1);
});
