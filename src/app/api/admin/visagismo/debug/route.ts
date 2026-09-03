import { NextRequest, NextResponse } from 'next/server';
import { extractFaceLandmarks } from '@/lib/visagism/face-landmarks';
import { generateMaskByMode } from '@/lib/visagism/mask';
import { replicateImageProvider } from '@/lib/visagism/providers/replicate';
import { HAIRCUTS_CATALOG } from '@/lib/visagism/catalog';
import type { MaskMode } from '@/lib/visagism/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('photo') as File | null;
    const haircutId = (formData.get('haircutId') as string) || 'fade_degrade';
    const customPrompt = formData.get('customPrompt') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const clientBuffer = Buffer.from(arrayBuffer);
    const mimeType = file.type || 'image/jpeg';

    const catalogItem = HAIRCUTS_CATALOG.find((h) => h.id === haircutId) || HAIRCUTS_CATALOG[0];
    const maskMode: MaskMode =
      catalogItem.maskType === 'hair_beard'
        ? 'HAIR_AND_BEARD'
        : catalogItem.maskType === 'beard'
        ? 'BEARD_ONLY'
        : 'HAIR_ONLY';

    const stylePrompt =
      customPrompt ||
      catalogItem.stylePrompt ||
      `Edit only the masked hair region. Apply men's ${catalogItem.name} haircut. Preserve exact original face.`;

    // 1. Extrai marcos faciais anatômicos reais
    const landmarks = await extractFaceLandmarks(clientBuffer);

    // 2. Gera máscara
    const maskBuffer = generateMaskByMode(maskMode, landmarks.imageWidth, landmarks.imageHeight, undefined, landmarks);

    // 3. Executa Inpainting FLUX Fill + Identity Gate + Composição
    const genResult = await replicateImageProvider.generatePreview({
      originalImageBuffer: clientBuffer,
      originalImageMimeType: mimeType,
      maskBuffer,
      maskMode,
      stylePrompt,
      landmarks,
    });

    if (!genResult) {
      return NextResponse.json({
        success: false,
        error: 'Falha na geração do modelo ou rejeição pelo Identity Gate.',
        landmarks,
        maskBase64: `data:image/png;base64,${maskBuffer.toString('base64')}`,
      }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      provider: genResult.provider,
      model: 'black-forest-labs/flux-fill-dev',
      latencyMs: genResult.latencyMs,
      identityScore: genResult.identityScore,
      outsideMaskPixelChangeRatio: genResult.outsideMaskPixelChangeRatio,
      faceSSIM: genResult.faceSSIM,
      maskMode,
      landmarks,
      originalBase64: `data:${mimeType};base64,${clientBuffer.toString('base64')}`,
      maskBase64: `data:image/png;base64,${maskBuffer.toString('base64')}`,
      rawGeneratedBase64: genResult.rawGeneratedBuffer
        ? `data:image/jpeg;base64,${genResult.rawGeneratedBuffer.toString('base64')}`
        : null,
      finalCompositeBase64: genResult.finalCompositeBuffer
        ? `data:image/jpeg;base64,${genResult.finalCompositeBuffer.toString('base64')}`
        : null,
    });
  } catch (error: any) {
    console.error('[ADMIN_DEBUG_VISAGISMO] Erro:', error);
    return NextResponse.json({ error: error.message || 'Erro interno de processamento' }, { status: 500 });
  }
}
