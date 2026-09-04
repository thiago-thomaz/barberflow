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
import { HAIRCUTS_CATALOG, BEARD_STYLES_CATALOG } from '@/lib/visagism/catalog';
import { generateMaskByMode } from '@/lib/visagism/mask';
import { extractFaceLandmarks } from '@/lib/visagism/face-landmarks';
import { preflightCheckUserPhoto, detectFaceGeometry } from '@/lib/visagism/face-detector';
import { validateIdentityQuality } from '@/lib/visagism/gate';
import type { MaskMode } from '@/lib/visagism/types';
import { logger } from '@/lib/logger';

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
    const {
      targetImageUrl,
      haircutName,
      haircutId,
      beardName: rawBeardName,
      beardId: rawBeardId,
      objective: rawObjective,
      clientLandmarks,
    } = body;

    if (!token) {
      logger.warn('[GENERATE_PREVIEW] Requisição sem token de sessão', {
        module: 'VISAGISM_API',
        action: 'MISSING_TOKEN',
      });
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    // 1. Busca sessão e valida status/expiração com relacionamentos
    const session = await prisma.visagismSession.findUnique({
      where: { publicToken: token },
      include: {
        profile: true,
        recommendations: true,
      },
    });

    if (!session || session.status === 'EXPIRED') {
      logger.warn(`[GENERATE_PREVIEW] Sessão não encontrada ou expirada para token: ${token.slice(0, 8)}...`, {
        module: 'VISAGISM_API',
        action: 'SESSION_INVALID_OR_EXPIRED',
      });
      return NextResponse.json({ error: 'Sessão não encontrada ou expirada' }, { status: 404 });
    }

    // Extrai dados complementares de recomendação da sessão se não fornecidos no body
    const sessionRec =
      session.recommendations?.find(
        (r) =>
          (haircutName && r.haircutName?.toLowerCase() === haircutName?.toLowerCase()) ||
          (haircutId && r.id === haircutId)
      ) || session.recommendations?.[0] || null;

    const beardName = rawBeardName || sessionRec?.beardName || null;
    const beardId = rawBeardId || null;
    const objective = rawObjective || session.profile?.objective || 'Corte + Barba';

    logger.visagism('GENERATION_REQUEST_STARTED', {
      sessionId: session.id,
      barbershopId: session.barbershopId,
      haircutName,
      haircutId,
      beardName,
      beardId,
      objective,
    });

    // 2. Limite de gerações aprovadas por sessão (padrão 3)
    const MAX_GENERATIONS = parseInt(process.env.VISAGISM_MAX_GENERATIONS_PER_SESSION || '3', 10);
    const existingGenerations = await prisma.visagismMetric.count({
      where: {
        sessionId: session.id,
        eventName: 'preview_generated',
      },
    });

    if (existingGenerations >= MAX_GENERATIONS) {
      logger.visagism('LIMIT_REACHED', {
        sessionId: session.id,
        barbershopId: session.barbershopId,
        existingGenerations,
        maxGenerations: MAX_GENERATIONS,
      });

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
      logger.warn(`[GENERATE_PREVIEW] Limite técnico de 8 tentativas atingido para sessão: ${session.id}`, {
        module: 'VISAGISM_API',
        action: 'MAX_ATTEMPTS_EXCEEDED',
        tenantId: session.barbershopId,
      });

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
      logger.warn(`[GENERATE_PREVIEW] Foto original não encontrada para sessão: ${session.id}`, {
        module: 'VISAGISM_API',
        action: 'ORIGINAL_PHOTO_MISSING',
        tenantId: session.barbershopId,
      });

      return NextResponse.json({
        success: false,
        message: 'Foto original do cliente não encontrada. Por favor, envie sua foto primeiro.',
        previewUrl: null,
      });
    }

    // 5. PRE-FLIGHT QUALITY CHECK (Executado ANTES de chamar a IA para não gastar créditos)
    const preflightStart = Date.now();
    const preflight = await preflightCheckUserPhoto(clientBuffer);
    const preflightDurationMs = Date.now() - preflightStart;

    logger.visagism('PREFLIGHT_CHECK', {
      sessionId: session.id,
      barbershopId: session.barbershopId,
      valid: preflight.valid,
      width: preflight.width,
      height: preflight.height,
      reason: preflight.reason,
      durationMs: preflightDurationMs,
    });

    if (!preflight.valid) {
      return NextResponse.json({
        success: false,
        message: preflight.reason || 'Foto não atende aos requisitos de qualidade facial.',
        previewUrl: null,
        remainingGenerations: Math.max(0, MAX_GENERATIONS - existingGenerations),
      });
    }

    // 6. DETECÇÃO DE MARCOS FACIAIS ANATÔMICOS REAIS (Olhos, Nariz, Boca, Hairline)
    const lmStart = Date.now();
    const landmarks = await extractFaceLandmarks(clientBuffer, preflight.width, preflight.height);
    const geometry =
      preflight.geometry ||
      (await detectFaceGeometry(clientBuffer, preflight.width, preflight.height, clientLandmarks));
    const lmDurationMs = Date.now() - lmStart;

    logger.visagism('LANDMARKS_EXTRACTED', {
      sessionId: session.id,
      barbershopId: session.barbershopId,
      confidence: landmarks.confidence,
      faceBox: landmarks.faceBox,
      durationMs: lmDurationMs,
    });

    // 7. Catálogo e Prompts de Edição Restrita (Cabelo + Barba)
    const catalogItem = HAIRCUTS_CATALOG.find(
      (h) =>
        (haircutId && h.id === haircutId) ||
        (haircutName && h.name.toLowerCase() === haircutName.toLowerCase()) ||
        (haircutName && h.name.toLowerCase().includes(haircutName.toLowerCase())) ||
        (haircutName && haircutName.toLowerCase().includes(h.name.toLowerCase()))
    );

    const beardCatalogItem = BEARD_STYLES_CATALOG.find(
      (b) =>
        (beardId && b.id === beardId) ||
        (beardName && b.name.toLowerCase() === beardName.toLowerCase()) ||
        (beardName && b.name.toLowerCase().includes(beardName.toLowerCase())) ||
        (beardName && beardName.toLowerCase().includes(b.name.toLowerCase()))
    );

    let maskMode: MaskMode = 'HAIR_ONLY';
    if (objective === 'Barba') {
      maskMode = 'BEARD_ONLY';
    } else if (
      objective === 'Corte + Barba' ||
      objective === 'Estilo completo' ||
      objective === 'Nao sei' ||
      beardName !== null
    ) {
      maskMode = 'HAIR_AND_BEARD';
    } else if (catalogItem?.maskType === 'hair_beard') {
      maskMode = 'HAIR_AND_BEARD';
    } else if (catalogItem?.maskType === 'beard') {
      maskMode = 'BEARD_ONLY';
    }

    const cleanCutName = haircutName || catalogItem?.name || 'modern fade';

    let stylePrompt: string;
    if (maskMode === 'HAIR_AND_BEARD') {
      const hairDesc =
        catalogItem?.stylePrompt?.replace(/^Apply photorealistic men's /i, '').replace(/\.$/, '') ||
        `men's ${cleanCutName} haircut with sharp skin fade on temples and textured top`;
      const beardDesc =
        beardCatalogItem?.stylePrompt ||
        (beardName
          ? `crisp groomed ${beardName} along jawline and cheeks`
          : 'sharp groomed stubble fade beard along jawline');

      stylePrompt = `A photorealistic portrait photograph of this man with ${hairDesc}, paired with a ${beardDesc}, crisp razor hairline and sharp beard lineup, ultra-detailed human hair and beard texture, authentic barbershop styling, 8k uhd, soft studio lighting`;
    } else if (maskMode === 'BEARD_ONLY') {
      const beardDesc =
        beardCatalogItem?.stylePrompt ||
        (beardName
          ? `crisp groomed ${beardName} along jawline and cheeks`
          : 'sharp groomed stubble fade beard along jawline');
      stylePrompt = `A photorealistic portrait photograph of this man with a ${beardDesc}, razor-sharp beard lineup, ultra-detailed human facial hair texture, authentic barbershop grooming, 8k uhd, soft studio lighting`;
    } else {
      stylePrompt =
        catalogItem?.stylePrompt ||
        `A photorealistic portrait photograph of this man with a ${cleanCutName} haircut, sharp fade gradient on temples, crisp natural hairline, highly detailed hair strands, barbershop styling, 8k uhd`;
    }

    const negativePrompt = catalogItem?.negativePrompt || beardCatalogItem?.negativePrompt;

    // 8. GERA MÁSCARA DINÂMICA ANATÔMICA ANCORADA NOS MARCOS REAIS (Cabelo + Barba)
    const maskStart = Date.now();
    const maskBuffer = generateMaskByMode(
      maskMode,
      preflight.width,
      preflight.height,
      geometry,
      landmarks
    );
    const maskDurationMs = Date.now() - maskStart;

    logger.visagism('MASK_GENERATED', {
      sessionId: session.id,
      barbershopId: session.barbershopId,
      maskMode,
      maskBytes: maskBuffer.length,
      durationMs: maskDurationMs,
    });

    // Registra tentativa
    await recordVisagismMetric({
      barbershopId: session.barbershopId,
      sessionId: session.id,
      eventName: 'generation_attempt',
      metadata: { haircutName: cleanCutName, maskMode },
    });

    // 9. EXECUTA FLUX.1 FILL + IDENTITY GATE BIOMÉTRICO + COMPOSIÇÃO DETERMINÍSTICA
    logger.info(`[GENERATE_PREVIEW] Disparando Replicate FLUX Inpainting para ${cleanCutName}...`, {
      module: 'VISAGISM_API',
      tenantId: session.barbershopId,
      metadata: { sessionId: session.id, haircutName: cleanCutName, maskMode },
    });

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
      logger.warn(`[GENERATE_PREVIEW] Falha na geração Replicate (Output nulo) após ${latencyMs}ms`, {
        module: 'VISAGISM_API',
        tenantId: session.barbershopId,
        metadata: { sessionId: session.id, haircutName: cleanCutName, latencyMs },
      });

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
    const gateStart = Date.now();
    const gateResult = await validateIdentityQuality({
      imageUrl: genResult.imageUrl,
      imageBuffer: genResult.finalCompositeBuffer,
      originalImageBuffer: clientBuffer,
      outsideMaskPixelChangeRatio: genResult.outsideMaskPixelChangeRatio,
      faceSSIM: genResult.faceSSIM,
      haircutName: cleanCutName,
      latencyMs,
    });
    const gateDurationMs = Date.now() - gateStart;

    logger.visagism('IDENTITY_QUALITY_GATE', {
      sessionId: session.id,
      barbershopId: session.barbershopId,
      passed: gateResult.passed,
      score: gateResult.score,
      outsideDiff: genResult.outsideMaskPixelChangeRatio,
      faceSSIM: genResult.faceSSIM,
      reason: gateResult.reason,
      durationMs: gateDurationMs,
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

    logger.visagism('PREVIEW_COMPLETED_SUCCESS', {
      sessionId: session.id,
      barbershopId: session.barbershopId,
      haircutName: cleanCutName,
      previewUrl: finalPreviewUrl,
      remainingGenerations: remaining,
      latencyMs,
      faceSSIM: genResult.faceSSIM,
      identityScore: genResult.identityScore,
    });

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
    const errorLatencyMs = Date.now() - startTime;
    logger.error('[GENERATE_PREVIEW] Erro interno durante geração de preview:', error, {
      module: 'VISAGISM_API',
      action: 'INTERNAL_ERROR',
      durationMs: errorLatencyMs,
    });
    return NextResponse.json({ error: 'Erro interno ao processar geração' }, { status: 500 });
  }
}
