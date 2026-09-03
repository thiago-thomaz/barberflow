import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import {
  getVisagismPhotoBuffer,
  recordVisagismMetric,
  VISAGISM_STORAGE_DIR,
  ensureVisagismStorageDir,
} from '@/lib/visagism/engine';
import { replicateImageProvider } from '@/lib/visagism/providers/replicate';
import { HAIRCUTS_CATALOG } from '@/lib/visagism/catalog';
import { generateMaskByMode } from '@/lib/visagism/mask';
import { extractFaceLandmarks } from '@/lib/visagism/face-landmarks';
import { preflightCheckUserPhoto, detectFaceGeometry } from '@/lib/visagism/face-detector';
import { validateIdentityQuality } from '@/lib/visagism/gate';
import type { MaskMode } from '@/lib/visagism/types';

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
    const { targetImageUrl, haircutName, haircutId, clientLandmarks } = body;

    if (!token) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    // 1. Busca sessão e valida status/expiração
    const session = await prisma.visagismSession.findUnique({
      where: { publicToken: token },
    });

    if (!session || session.status === 'EXPIRED') {
      return NextResponse.json({ error: 'Sessão não encontrada ou expirada' }, { status: 404 });
    }

    // 2. Limite de gerações aprovadas por sessão (padrão 3)
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

    // 3. Limite de segurança de tentativas técnicas (anti-abuso / máx 8 tentativas)
    const totalAttempts = await prisma.visagismMetric.count({
      where: {
        sessionId: session.id,
        eventName: 'generation_attempt',
      },
    });

    if (totalAttempts >= 8) {
      return NextResponse.json({
        success: false,
        message: 'Limite de tentativas técnicas atingido para esta sessão. Entre em contato com a barbearia.',
        previewUrl: null,
        remainingGenerations: 0,
      });
    }

    // 4. Recupera o buffer da foto original do cliente
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
        message: 'Foto original do cliente não encontrada. Por favor, envie sua foto primeiro.',
        previewUrl: null,
      });
    }

    // 5. PRE-FLIGHT QUALITY CHECK (Executado ANTES de chamar a IA para não gastar créditos)
    const preflight = await preflightCheckUserPhoto(clientBuffer);
    if (!preflight.valid) {
      return NextResponse.json({
        success: false,
        message: preflight.reason || 'Foto não atende aos requisitos de qualidade facial.',
        previewUrl: null,
        remainingGenerations: Math.max(0, MAX_GENERATIONS - existingGenerations),
      });
    }

    // 6. DETECÇÃO DE MARCOS FACIAIS ANATÔMICOS REAIS (Olhos, Nariz, Boca, Hairline)
    const landmarks = await extractFaceLandmarks(clientBuffer, preflight.width, preflight.height);
    const geometry =
      preflight.geometry ||
      (await detectFaceGeometry(clientBuffer, preflight.width, preflight.height, clientLandmarks));

    // 7. Catálogo e Prompts de Edição Restrita
    const catalogItem = HAIRCUTS_CATALOG.find(
      (h) =>
        (haircutId && h.id === haircutId) ||
        (haircutName && h.name.toLowerCase() === haircutName.toLowerCase())
    );

    const maskMode: MaskMode =
      catalogItem?.maskType === 'hair_beard'
        ? 'HAIR_AND_BEARD'
        : catalogItem?.maskType === 'beard'
        ? 'BEARD_ONLY'
        : 'HAIR_ONLY';

    const cleanCutName = haircutName || catalogItem?.name || 'modern fade';

    const stylePrompt =
      catalogItem?.stylePrompt ||
      `Edit only the masked hair region of the photograph. Apply a realistic men's ${cleanCutName} haircut. Preserve exact original face, eyes, nose, mouth and facial skin. Natural barber finish.`;

    const negativePrompt = catalogItem?.negativePrompt;

    // 8. GERA MÁSCARA DINÂMICA ANATÔMICA ANCORADA NOS MARCOS REAIS
    const maskBuffer = generateMaskByMode(
      maskMode,
      preflight.width,
      preflight.height,
      geometry,
      landmarks
    );

    // Registra tentativa
    await recordVisagismMetric({
      barbershopId: session.barbershopId,
      sessionId: session.id,
      eventName: 'generation_attempt',
      metadata: { haircutName: cleanCutName, maskMode },
    });

    // 9. EXECUTA FLUX.1 FILL + IDENTITY GATE BIOMÉTRICO + COMPOSIÇÃO DETERMINÍSTICA
    const genResult = await replicateImageProvider.generatePreview({
      originalImageBuffer: clientBuffer,
      originalImageMimeType: clientMime,
      maskBuffer,
      maskMode,
      stylePrompt,
      negativePrompt,
      geometry,
      landmarks,
    });

    const latencyMs = Date.now() - startTime;

    if (!genResult || !genResult.finalCompositeBuffer) {
      await recordVisagismMetric({
        barbershopId: session.barbershopId,
        sessionId: session.id,
        eventName: 'generation_failed',
        metadata: { haircutName: cleanCutName, latencyMs, reason: 'Provider output null' },
      });

      return NextResponse.json({
        success: false,
        message: 'Não conseguimos gerar a simulação nesta tentativa. Tente novamente sem descontar suas simulações.',
        previewUrl: null,
      });
    }

    // 10. TRI-GATE DE PRESERVAÇÃO DE IDENTIDADE E PIXELS
    const gateResult = await validateIdentityQuality({
      imageUrl: genResult.imageUrl,
      imageBuffer: genResult.finalCompositeBuffer,
      originalImageBuffer: clientBuffer,
      outsideMaskPixelChangeRatio: genResult.outsideMaskPixelChangeRatio,
      faceSSIM: genResult.faceSSIM,
      haircutName: cleanCutName,
      latencyMs,
    });

    if (!gateResult.passed) {
      await recordVisagismMetric({
        barbershopId: session.barbershopId,
        sessionId: session.id,
        eventName: 'generation_rejected',
        metadata: {
          haircutName: cleanCutName,
          latencyMs,
          rejection_reason: gateResult.reason,
          outside_diff: genResult.outsideMaskPixelChangeRatio,
          face_ssim: genResult.faceSSIM,
        },
      });

      return NextResponse.json({
        success: false,
        message: 'Não conseguimos preservar sua identidade com qualidade suficiente nesta tentativa. Sua foto original foi mantida e nenhuma imagem incorreta foi exibida.',
        previewUrl: null,
        remainingGenerations: Math.max(0, MAX_GENERATIONS - existingGenerations),
      });
    }

    // 11. Salva a imagem composta final no storage de simulações
    ensureVisagismStorageDir();
    const previewsDir = path.join(VISAGISM_STORAGE_DIR, 'previews');
    if (!fs.existsSync(previewsDir)) {
      fs.mkdirSync(previewsDir, { recursive: true });
    }

    const previewFileName = `preview_${session.id}_${crypto.randomBytes(8).toString('hex')}.jpg`;
    const previewFilePath = path.join(previewsDir, previewFileName);
    fs.writeFileSync(previewFilePath, genResult.finalCompositeBuffer);

    // 12. Registra métrica de sucesso (esta sim desconta crédito)
    await recordVisagismMetric({
      barbershopId: session.barbershopId,
      sessionId: session.id,
      eventName: 'preview_generated',
      metadata: {
        haircutName: cleanCutName,
        targetImageUrl,
        provider: genResult.provider,
        maskMode,
        latencyMs,
        qualityScore: gateResult.score,
        outside_diff: genResult.outsideMaskPixelChangeRatio,
        face_ssim: genResult.faceSSIM,
        previewFileName,
      },
    });

    const remaining = Math.max(0, MAX_GENERATIONS - (existingGenerations + 1));
    const finalPreviewUrl = `/api/visagismo/session/${token}/preview/${previewFileName}`;

    return NextResponse.json({
      success: true,
      previewUrl: finalPreviewUrl,
      haircutName: cleanCutName,
      remainingGenerations: remaining,
      maskMode,
      qualityScore: gateResult.score,
      faceSSIM: genResult.faceSSIM,
      identityScore: genResult.identityScore,
    });
  } catch (error: any) {
    console.error('[GENERATE_PREVIEW] Erro interno:', error);
    return NextResponse.json({ error: 'Erro interno ao processar geração' }, { status: 500 });
  }
}
