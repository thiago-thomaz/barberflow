import { NextRequest, NextResponse } from 'next/server';
import { extractFaceLandmarks } from '@/lib/visagism/face-landmarks';
import { generateMaskByMode } from '@/lib/visagism/mask';
import { replicateImageProvider } from '@/lib/visagism/providers/replicate';
import { validateIdentityGate } from '@/lib/visagism/identity-gate';
import { HAIRCUTS_CATALOG } from '@/lib/visagism/catalog';
import type { MaskMode } from '@/lib/visagism/types';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const { photoBase64, haircutId = 'low-fade', mode = 'HAIR_ONLY' } = body;

    if (!photoBase64) {
      return NextResponse.json({ error: 'photoBase64 obrigatório' }, { status: 400 });
    }

    const cleanBase64 = photoBase64.replace(/^data:image\/\w+;base64,/, '');
    const photoBuffer = Buffer.from(cleanBase64, 'base64');

    const meta = await sharp(photoBuffer).metadata();
    const width = meta.width || 768;
    const height = meta.height || 1024;

    // 1. Extração de Marcos Anatômicos Reais
    const landmarks = await extractFaceLandmarks(photoBuffer);

    // 2. Geração da Máscara
    const maskBuffer = generateMaskByMode(
      mode as MaskMode,
      width,
      height,
      undefined,
      landmarks
    );

    // 3. Estilo e Prompt
    const catalogItem = HAIRCUTS_CATALOG.find((h) => h.id === haircutId) || HAIRCUTS_CATALOG[0];
    const stylePrompt = catalogItem.stylePrompt || `Men's ${catalogItem.name} haircut, barber finish`;

    // 4. Execução do Inpainting
    const genResult = await replicateImageProvider.generatePreview({
      originalImageBuffer: photoBuffer,
      originalImageMimeType: 'image/jpeg',
      maskBuffer,
      maskMode: mode as MaskMode,
      stylePrompt,
      negativePrompt: catalogItem.negativePrompt,
      denoisingStrength: 0.50,
    });

    const latencyMs = Date.now() - startTime;

    if (!genResult || !genResult.finalCompositeBuffer || !genResult.rawGeneratedBuffer) {
      return NextResponse.json({
        success: false,
        error: 'Provedor Replicate retornou nulo ou falhou.',
        latencyMs,
      }, { status: 502 });
    }

    // 5. Validação Biométrica no Identity Gate
    const gateResult = await validateIdentityGate({
      originalImageBuffer: photoBuffer,
      generatedRawBuffer: genResult.rawGeneratedBuffer,
      finalCompositeBuffer: genResult.finalCompositeBuffer,
      maskBuffer,
      outsideMaskPixelChangeRatio: genResult.outsideMaskPixelChangeRatio,
      faceSSIM: genResult.faceSSIM,
      haircutName: catalogItem.name,
      latencyMs,
    });

    return NextResponse.json({
      success: true,
      data: {
        originalBase64: `data:image/jpeg;base64,${photoBuffer.toString('base64')}`,
        maskBase64: `data:image/png;base64,${maskBuffer.toString('base64')}`,
        rawGeneratedBase64: `data:image/jpeg;base64,${genResult.rawGeneratedBuffer.toString('base64')}`,
        finalCompositeBase64: `data:image/jpeg;base64,${genResult.finalCompositeBuffer.toString('base64')}`,
        landmarks: {
          confidence: landmarks.confidence,
          isFrontal: landmarks.isFrontal,
          faceBox: landmarks.faceBox,
          leftEye: landmarks.leftEye,
          rightEye: landmarks.rightEye,
          noseTip: landmarks.nose.tip,
          mouthCenter: landmarks.mouth.center,
          chin: landmarks.chin,
        },
        metrics: {
          identitySimilarity: gateResult.identitySimilarity,
          outsideDiff: genResult.outsideMaskPixelChangeRatio,
          faceSSIM: genResult.faceSSIM,
          passed: gateResult.passed,
          score: gateResult.score,
          reason: gateResult.reason || 'Identidade e anatomia 100% preservadas',
          latencyMs,
          model: 'black-forest-labs/flux-fill-dev',
          provider: genResult.provider,
        },
      },
    });
  } catch (err: any) {
    console.error('[DEBUG_IDENTITY_API] Erro:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
