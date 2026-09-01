import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVisagismPhotoBuffer, recordVisagismMetric } from '@/lib/visagism/engine';
import { replicateImageProvider } from '@/lib/visagism/providers/replicate';
import { HAIRCUTS_CATALOG } from '@/lib/visagism/catalog';
import { generateHairMaskPNG } from '@/lib/visagism/mask';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: {
    token: string;
  };
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const startTime = Date.now();
  try {
    const { token } = params;
    const body = await req.json().catch(() => ({}));
    const { targetImageUrl, haircutName, haircutId } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    // Busca sessão ativa e valida expiração
    const session = await prisma.visagismSession.findUnique({
      where: { publicToken: token },
    });

    if (!session || session.status === 'EXPIRED') {
      return NextResponse.json({ error: 'Sessão não encontrada ou expirada' }, { status: 404 });
    }

    // Controle de custo / limite por sessão (default 3)
    const MAX_GENERATIONS = parseInt(process.env.VISAGISM_MAX_GENERATIONS_PER_SESSION || '3', 10);
    const existingGenerations = await prisma.visagismMetric.count({
      where: {
        sessionId: session.id,
        eventName: 'preview_generated',
      },
    });

    if (existingGenerations >= MAX_GENERATIONS) {
      return NextResponse.json({
        success: false,
        message: `Você já atingiu o limite de ${MAX_GENERATIONS} simulações gratuitas para esta sessão.`,
        previewUrl: null,
        remainingGenerations: 0,
      });
    }

    // Busca foto do cliente salva no storage privado
    let clientBuffer: Buffer | null = null;
    let clientMime = 'image/jpeg';

    const photoData = await getVisagismPhotoBuffer(session.id);
    if (photoData && photoData.buffer) {
      clientBuffer = photoData.buffer;
      clientMime = photoData.mimeType;
    } else if (body.clientPhotoBase64 && typeof body.clientPhotoBase64 === 'string') {
      const match = body.clientPhotoBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        clientMime = match[1];
        clientBuffer = Buffer.from(match[2], 'base64');
      } else {
        clientBuffer = Buffer.from(body.clientPhotoBase64, 'base64');
      }
    }

    if (!clientBuffer) {
      return NextResponse.json({
        success: false,
        message: 'Foto original do cliente não encontrada para inpainting facial.',
        previewUrl: null,
      });
    }

    // Localiza os prompts e máscara no catálogo
    const catalogItem = HAIRCUTS_CATALOG.find(
      (h) =>
        (haircutId && h.id === haircutId) ||
        (haircutName && h.name.toLowerCase() === haircutName.toLowerCase())
    );

    const stylePrompt =
      catalogItem?.stylePrompt ||
      `Edit the existing person's hairstyle. Apply a realistic men's ${haircutName || 'fade'} haircut. Preserve exact original face, eyes, nose, mouth and facial structure. Photorealistic barber finish.`;

    const negativePrompt = catalogItem?.negativePrompt;
    const includeBeard = catalogItem?.maskType === 'hair_beard' || catalogItem?.maskType === 'beard';

    // Gera máscara capilar protegendo a região central dos olhos/nariz/boca
    const maskBuffer = generateHairMaskPNG(768, 1024, { includeBeard });

    // Registra métrica de início
    await recordVisagismMetric({
      barbershopId: session.barbershopId,
      sessionId: session.id,
      eventName: 'generation_started',
      metadata: { haircutName: haircutName || catalogItem?.name },
    });

    // Executa Inpainting com preservação de identidade facial
    const genResult = await replicateImageProvider.generatePreview({
      originalImageBuffer: clientBuffer,
      originalImageMimeType: clientMime,
      maskBuffer,
      stylePrompt,
      negativePrompt,
    });

    const latencyMs = Date.now() - startTime;

    if (!genResult || !genResult.imageUrl) {
      await recordVisagismMetric({
        barbershopId: session.barbershopId,
        sessionId: session.id,
        eventName: 'generation_failed',
        metadata: { haircutName, latencyMs },
      });

      return NextResponse.json({
        success: false,
        message: 'Não foi possível gerar a simulação no momento.',
        previewUrl: null,
      });
    }

    // Registra métrica de sucesso
    await recordVisagismMetric({
      barbershopId: session.barbershopId,
      sessionId: session.id,
      eventName: 'preview_generated',
      metadata: {
        haircutName: haircutName || catalogItem?.name,
        targetImageUrl,
        provider: genResult.provider,
        latencyMs,
      },
    });

    const remaining = Math.max(0, MAX_GENERATIONS - (existingGenerations + 1));

    return NextResponse.json({
      success: true,
      previewUrl: genResult.imageUrl,
      haircutName: haircutName || catalogItem?.name,
      remainingGenerations: remaining,
    });
  } catch (error: any) {
    console.error('Erro na rota generate-preview:', error);
    return NextResponse.json({ error: 'Erro interno ao processar geração' }, { status: 500 });
  }
}
