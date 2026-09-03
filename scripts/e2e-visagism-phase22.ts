import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { prisma } from '../src/lib/prisma.ts';
import { extractFaceLandmarks } from '../src/lib/visagism/face-landmarks.ts';
import { generateMaskByMode } from '../src/lib/visagism/mask.ts';
import { replicateImageProvider } from '../src/lib/visagism/providers/replicate.ts';
import { validateIdentityGate } from '../src/lib/visagism/identity-gate.ts';
import { compositeInpaintingResult } from '../src/lib/visagism/composite.ts';
import { HAIRCUTS_CATALOG } from '../src/lib/visagism/catalog.ts';

async function runE2EPhase22() {
  console.log('\n=============================================================');
  console.log('  BARBERFLOW — FASE 22: TESTE E2E DEFINITIVO DE VISAGISMO  ');
  console.log('=============================================================\n');

  const startTime = Date.now();

  // 1. Localiza a foto real de teste
  const testPhotoPath = path.join(
    'C:',
    'Users',
    'Thiago Thomaz',
    '.gemini',
    'antigravity-ide',
    'brain',
    '700c4247-d57c-4043-b11e-ef83700dd450',
    'scratch',
    'real_user_photo.jpg'
  );

  if (!fs.existsSync(testPhotoPath)) {
    console.error('❌ Foto real de teste não encontrada em:', testPhotoPath);
    process.exit(1);
  }

  const originalBuffer = fs.readFileSync(testPhotoPath);
  const meta = await sharp(originalBuffer).metadata();
  console.log(`[ETAPA 1/8] Foto real do cliente carregada: ${meta.width}x${meta.height} (${originalBuffer.length} bytes)`);

  // 2. Extração de marcos faciais anatômicos reais
  console.log('[ETAPA 2/8] Extraindo marcos anatômicos com face-landmarks...');
  const landmarks = await extractFaceLandmarks(originalBuffer);
  console.log(`  ✓ Confiança da detecção: ${(landmarks.confidence * 100).toFixed(1)}%`);
  console.log(`  ✓ Bounding Box Facial: [x: ${landmarks.faceBox.x}, y: ${landmarks.faceBox.y}, w: ${landmarks.faceBox.width}, h: ${landmarks.faceBox.height}]`);
  console.log(`  ✓ Posição dos Olhos: E(${landmarks.leftEye.x}, ${landmarks.leftEye.y}) | D(${landmarks.rightEye.x}, ${landmarks.rightEye.y})`);
  console.log(`  ✓ Nariz e Boca: Nariz(${landmarks.nose.tip.x}, ${landmarks.nose.tip.y}) | Boca(${landmarks.mouth.center.x}, ${landmarks.mouth.center.y})`);

  // 3. Geração da máscara adaptativa estrita (HAIR_ONLY)
  console.log('[ETAPA 3/8] Gerando máscara de inpainting adaptada à anatomia do cliente...');
  const maskBuffer = generateMaskByMode('HAIR_ONLY', meta.width, meta.height, undefined, landmarks);
  console.log(`  ✓ Máscara PNG monocromática gerada (${maskBuffer.length} bytes)`);

  // 4. Inpainting com Replicate (FLUX.1 Fill Dev)
  const cut = HAIRCUTS_CATALOG[0]; // Low Fade
  console.log(`[ETAPA 4/8] Executando inpainting com FLUX.1 Fill Dev para o corte "${cut.name}"...`);
  const stylePrompt = cut.stylePrompt || `Men's ${cut.name} haircut, barber finish`;

  const inpaintRes = await replicateImageProvider.generatePreview({
    originalImageBuffer: originalBuffer,
    originalImageMimeType: 'image/jpeg',
    maskBuffer,
    maskMode: 'HAIR_ONLY',
    stylePrompt,
    negativePrompt: cut.negativePrompt,
    denoisingStrength: 0.50,
  });

  if (!inpaintRes || !inpaintRes.finalCompositeBuffer || !inpaintRes.rawGeneratedBuffer) {
    console.error('❌ Falha na geração com o provedor Replicate.');
    process.exit(1);
  }

  console.log(`  ✓ Inpainting concluído em ${((inpaintRes.latencyMs || 0) / 1000).toFixed(1)}s`);
  console.log(`  ✓ ID da predição: ${inpaintRes.generationId}`);

  // 5. Validação Biométrica no Identity Gate (Original vs RAW Gerado antes do composite)
  console.log('[ETAPA 5/8] Avaliando preservação de identidade no Identity Gate (Biometria)...');
  const gateResult = await validateIdentityGate({
    originalImageBuffer: originalBuffer,
    generatedRawBuffer: inpaintRes.rawGeneratedBuffer,
    finalCompositeBuffer: inpaintRes.finalCompositeBuffer,
    maskBuffer,
    outsideMaskPixelChangeRatio: inpaintRes.outsideMaskPixelChangeRatio,
    faceSSIM: inpaintRes.faceSSIM,
    haircutName: cut.name,
    latencyMs: inpaintRes.latencyMs,
  });

  console.log(`  ✓ Veredito do Identity Gate: ${gateResult.passed ? '✅ APROVADO' : '❌ REJEITADO'}`);
  console.log(`  ✓ Similaridade Biométrica da IA (RAW vs Original): ${(gateResult.identitySimilarity * 100).toFixed(1)}% (Mínimo: 70%)`);
  console.log(`  ✓ Fidelidade Estrutural Facial (SSIM): ${(gateResult.faceSSIM * 100).toFixed(2)}% (Mínimo: 95%)`);
  console.log(`  ✓ Divergência Fora da Máscara: ${(gateResult.outsideDiff * 100).toFixed(3)}% (Máximo: 1.0%)`);

  if (!gateResult.passed) {
    console.error(`❌ Rejeitado pelo Identity Gate: ${gateResult.reason}`);
    process.exit(1);
  }

  // 6. Salvamento dos 4 Estágios para Auditoria Visual Permanente
  console.log('[ETAPA 6/8] Gravando artefatos dos 4 estágios em storage/visagismo/test/ ...');
  const testOutDir = path.join(process.cwd(), 'storage', 'visagismo', 'test');
  if (!fs.existsSync(testOutDir)) {
    fs.mkdirSync(testOutDir, { recursive: true });
  }

  fs.writeFileSync(path.join(testOutDir, 'original.jpg'), originalBuffer);
  fs.writeFileSync(path.join(testOutDir, 'mask.png'), maskBuffer);
  fs.writeFileSync(path.join(testOutDir, 'raw_generated.jpg'), inpaintRes.rawGeneratedBuffer);
  fs.writeFileSync(path.join(testOutDir, 'final_composite.jpg'), inpaintRes.finalCompositeBuffer);

  console.log(`  ✓ original.jpg salvo`);
  console.log(`  ✓ mask.png salvo`);
  console.log(`  ✓ raw_generated.jpg salvo`);
  console.log(`  ✓ final_composite.jpg salvo`);

  // 7. Registro de Métrica no Banco de Dados
  console.log('[ETAPA 7/8] Registrando métrica auditada de produção...');
  try {
    const barbershop = await prisma.barbershop.findFirst();
    if (barbershop) {
      await prisma.visagismMetric.create({
        data: {
          barbershopId: barbershop.id,
          sessionId: 'e2e_phase22_validation',
          eventName: 'e2e_phase22_validated',
          metadata: JSON.stringify({
            model: 'black-forest-labs/flux-fill-dev',
            latencyMs: inpaintRes.latencyMs,
            identitySimilarity: gateResult.identitySimilarity,
            outsideDiff: gateResult.outsideDiff,
            faceSSIM: gateResult.faceSSIM,
            passed: gateResult.passed,
          }),
        },
      });
      console.log('  ✓ Métrica persistida no banco com sucesso.');
    }
  } catch (e: any) {
    console.warn('  ⚠️ Aviso ao gravar métrica:', e.message);
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n=============================================================');
  console.log(`  🎉 TESTE E2E DA FASE 22 CONCLUÍDO COM 100% DE SUCESSO! (${totalTime}s)  `);
  console.log('=============================================================\n');
}

runE2EPhase22().catch((err) => {
  console.error('Fatal E2E Error:', err);
  process.exit(1);
});
