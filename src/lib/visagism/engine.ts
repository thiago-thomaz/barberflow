import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { prisma } from '../prisma.ts';
import { getVisagismProvider } from './provider.ts';
import type { VisagismProfileInput, VisagismEvaluationResponse } from './types.ts';

export const VISAGISM_SESSION_TTL_HOURS = 24;
export const VISAGISM_STORAGE_DIR = path.join(process.cwd(), 'storage', 'visagismo');

/**
 * Garante que o diretório de armazenamento privado local exista
 */
export function ensureVisagismStorageDir(): string {
  if (!fs.existsSync(VISAGISM_STORAGE_DIR)) {
    fs.mkdirSync(VISAGISM_STORAGE_DIR, { recursive: true });
  }
  return VISAGISM_STORAGE_DIR;
}

/**
 * Cria ou recupera uma sessão segura de Visagismo
 */
export async function createOrGetVisagismSession(params: {
  barbershopId: string;
  phone?: string;
  customerId?: string;
}) {
  const { barbershopId, phone, customerId } = params;

  let resolvedCustomerId = customerId;

  if (!resolvedCustomerId && phone) {
    const digits = phone.replace(/\D/g, '');
    const phoneLast8 = digits.length >= 8 ? digits.slice(-8) : digits;
    const customer = await prisma.customer.findFirst({
      where: {
        barbershopId,
        OR: [{ phone: { contains: phoneLast8 } }, { whatsappPhone: phone }],
      },
    });
    if (customer) {
      resolvedCustomerId = customer.id;
    }
  }

  // Gera um token criptograficamente seguro e aleatório (32 bytes hex)
  const publicToken = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + VISAGISM_SESSION_TTL_HOURS * 60 * 60 * 1000);

  const session = await prisma.visagismSession.create({
    data: {
      barbershopId,
      customerId: resolvedCustomerId || null,
      publicToken,
      status: 'DRAFT',
      expiresAt,
    },
    include: {
      barbershop: {
        select: {
          id: true,
          name: true,
          slug: true,
          phone: true,
          address: true,
        },
      },
    },
  });

  // Registra métrica de início
  await recordVisagismMetric({
    barbershopId,
    sessionId: session.id,
    eventName: 'visagism_started',
    metadata: { hasCustomer: !!resolvedCustomerId },
  });

  return session;
}

/**
 * Busca sessão pelo publicToken com validação de expiração
 */
export async function getVisagismSessionByToken(publicToken: string) {
  if (!publicToken) return null;

  const session = await prisma.visagismSession.findUnique({
    where: { publicToken },
    include: {
      barbershop: {
        select: {
          id: true,
          name: true,
          slug: true,
          phone: true,
          address: true,
          logoUrl: true,
          services: {
            where: { isActive: true, deletedAt: null },
            select: { id: true, name: true, price: true, durationMin: true },
          },
        },
      },
      customer: {
        select: { id: true, name: true, phone: true },
      },
      profile: true,
      recommendations: true,
    },
  });

  if (!session) return null;

  const now = new Date();
  if (session.expiresAt < now && session.status !== 'COMPLETED') {
    await prisma.visagismSession.update({
      where: { id: session.id },
      data: { status: 'EXPIRED' },
    });
  }

  return session;
}

/**
 * Salva a foto de selfie do usuário com validações de segurança
 */
export async function saveVisagismPhoto(params: {
  sessionId: string;
  fileBuffer: Buffer;
  mimeType: string;
  originalName?: string;
}) {
  const { sessionId, fileBuffer, mimeType } = params;

  // Validação de tamanho (máximo 5MB)
  const MAX_SIZE_BYTES = 5 * 1024 * 1024;
  if (fileBuffer.length > MAX_SIZE_BYTES) {
    throw new Error('TAMANHO_EXCEDIDO_5MB');
  }

  // Validação de MIME Type permitido
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (!allowedMimeTypes.includes(mimeType.toLowerCase())) {
    throw new Error('FORMATO_INVALIDO_APENAS_JPG_PNG_WEBP');
  }

  ensureVisagismStorageDir();

  // Nome do arquivo protegido e aleatório
  const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
  const fileName = `visagism_${sessionId}_${crypto.randomBytes(8).toString('hex')}.${ext}`;
  const filePath = path.join(VISAGISM_STORAGE_DIR, fileName);

  // Escreve de forma síncrona/atômica
  fs.writeFileSync(filePath, fileBuffer);

  // Executa análise visual com IA (Gemini Vision)
  let visionAnalysis: { detectedFaceShape?: string; notes?: string } = {};
  try {
    const provider = getVisagismProvider();
    if (provider.analyzePhoto) {
      visionAnalysis = await provider.analyzePhoto(fileBuffer, mimeType);
    }
  } catch (err) {
    console.warn('Falha silenciosa na análise Gemini Vision:', err);
  }

  const updatedSession = await prisma.visagismSession.update({
    where: { id: sessionId },
    data: {
      photoStorageKey: fileName,
      photoMimeType: mimeType,
      photoSize: fileBuffer.length,
      consentAt: new Date(),
      status: 'PHOTO_UPLOADED',
    },
  });

  await recordVisagismMetric({
    barbershopId: updatedSession.barbershopId,
    sessionId,
    eventName: 'photo_uploaded',
    metadata: { sizeBytes: fileBuffer.length, mimeType, detectedShape: visionAnalysis.detectedFaceShape },
  });

  return {
    success: true,
    fileName,
    detectedFaceShape: visionAnalysis.detectedFaceShape,
    notes: visionAnalysis.notes,
  };
}

/**
 * Exclui a foto do usuário respeitando a LGPD (Direito ao Esquecimento)
 */
export async function deleteVisagismPhoto(sessionId: string) {
  const session = await prisma.visagismSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) throw new Error('SESSAO_NAO_ENCONTRADA');

  if (session.photoStorageKey) {
    const filePath = path.join(VISAGISM_STORAGE_DIR, session.photoStorageKey);
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.warn('Erro ao remover arquivo de foto:', err);
      }
    }
  }

  const updated = await prisma.visagismSession.update({
    where: { id: sessionId },
    data: {
      photoStorageKey: null,
      photoDeletedAt: new Date(),
    },
  });

  return updated;
}

/**
 * Executa a avaliação do questionário de Visagismo e persiste o perfil e as recomendações
 */
export async function evaluateVisagismSession(
  session: { id: string; barbershopId: string; publicToken: string },
  profileInput: VisagismProfileInput
): Promise<VisagismEvaluationResponse> {
  const { id: sessionId, barbershopId } = session;

  // Busca serviços ativos da barbearia para mapeamento
  const shop = await prisma.barbershop.findUnique({
    where: { id: barbershopId },
    include: {
      services: {
        where: { isActive: true, deletedAt: null },
        select: { id: true, name: true, price: true },
      },
    },
  });

  const provider = getVisagismProvider();
  const evaluation = await provider.evaluateProfile(profileInput, shop?.services || []);

  // Salva o Perfil de Visagismo (Upsert)
  await prisma.visagismProfile.upsert({
    where: { sessionId },
    create: {
      sessionId,
      objective: profileInput.objective,
      style: profileInput.style,
      changeLevel: profileInput.changeLevel,
      maintenanceLevel: profileInput.maintenanceLevel,
      hairLength: profileInput.hairLength,
      faceShape: profileInput.faceShape,
      colorPreference: profileInput.colorPreference || null,
    },
    update: {
      objective: profileInput.objective,
      style: profileInput.style,
      changeLevel: profileInput.changeLevel,
      maintenanceLevel: profileInput.maintenanceLevel,
      hairLength: profileInput.hairLength,
      faceShape: profileInput.faceShape,
      colorPreference: profileInput.colorPreference || null,
    },
  });

  // Limpa recomendações antigas se houver
  await prisma.visagismRecommendation.deleteMany({
    where: { sessionId },
  });

  // Salva as 3 novas recomendações no banco
  for (const rec of evaluation.recommendations) {
    await prisma.visagismRecommendation.create({
      data: {
        sessionId,
        haircutName: rec.haircutName,
        haircutStyle: rec.haircutStyle,
        beardName: rec.beardName || null,
        hairColor: rec.hairColor || null,
        maintenance: rec.maintenance,
        reasoning: rec.reasoning,
        barberTips: rec.barberTips,
        serviceSuggestionId: rec.serviceSuggestionId || null,
        referenceImageUrl: rec.referenceImageUrl || null,
        score: rec.score,
      },
    });
  }

  await prisma.visagismSession.update({
    where: { id: sessionId },
    data: { status: 'COMPLETED' },
  });

  await recordVisagismMetric({
    barbershopId,
    sessionId,
    eventName: 'recommendation_generated',
    metadata: {
      faceShape: profileInput.faceShape,
      style: profileInput.style,
      topRecommendation: evaluation.recommendations[0]?.haircutName,
    },
  });

  return evaluation;
}

/**
 * Registra métricas de visagismo com isolamento multitenant
 */
export async function recordVisagismMetric(params: {
  barbershopId: string;
  sessionId?: string;
  eventName: string;
  metadata?: any;
}) {
  const { barbershopId, sessionId, eventName, metadata } = params;
  try {
    return await prisma.visagismMetric.create({
      data: {
        barbershopId,
        sessionId: sessionId || null,
        eventName,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  } catch (err) {
    console.warn('Erro ao registrar métrica de visagismo:', err);
  }
}
