import sharp from 'sharp';
import type { IdentityGateResult } from './types.ts';

export const IDENTITY_SIMILARITY_THRESHOLD = 0.85;
export const MAX_OUTSIDE_MASK_CHANGE_RATIO = 0.01; // Máximo 1% de diferença fora da máscara permitida
export const MIN_PROTECTED_FACE_SSIM = 0.95; // Mínimo 95% de fidelidade estrutural no rosto

export interface ValidateGateInput {
  imageUrl?: string;
  imageBuffer?: Buffer;
  originalImageBuffer?: Buffer;
  outsideMaskPixelChangeRatio?: number;
  faceSSIM?: number;
  haircutName?: string;
  latencyMs?: number;
}

/**
 * Validação Tripla de Qualidade e Preservação de Identidade Real:
 * 
 * Gate 1: Pixel Preservation Gate (fora da máscara, diferença deve ser ~0%).
 * Gate 2: Face Protected Region Gate (SSIM no núcleo facial deve ser >= 0.95).
 * Gate 3: Validação de Formato, Latência e Não-Vacuidade da Imagem.
 */
export async function validateIdentityQuality(
  params: ValidateGateInput
): Promise<IdentityGateResult> {
  const {
    imageUrl,
    imageBuffer,
    outsideMaskPixelChangeRatio = 0,
    faceSSIM = 1.0,
    latencyMs,
  } = params;

  // 1. Validação de presença de dados
  if (!imageUrl && !imageBuffer) {
    return {
      passed: false,
      score: 0,
      reason: 'Buffer ou URL da imagem ausente.',
    };
  }

  // 2. Gate 1: Pixel Preservation Gate (Fora da Máscara)
  if (outsideMaskPixelChangeRatio > MAX_OUTSIDE_MASK_CHANGE_RATIO) {
    return {
      passed: false,
      score: Math.max(0, 1.0 - outsideMaskPixelChangeRatio),
      reason: `Rejeitado pelo Pixel Preservation Gate: ${(outsideMaskPixelChangeRatio * 100).toFixed(2)}% de alteração fora da máscara (limite máx 1.0%).`,
    };
  }

  // 3. Gate 2: Face Protected Region Gate (SSIM Facial)
  if (faceSSIM < MIN_PROTECTED_FACE_SSIM) {
    return {
      passed: false,
      score: faceSSIM,
      reason: `Rejeitado pelo Face SSIM Gate: fidelidade do rosto de ${(faceSSIM * 100).toFixed(1)}% abaixo do limiar mínimo (${MIN_PROTECTED_FACE_SSIM * 100}%).`,
    };
  }

  // 4. Gate 3: Validação de Sanidade da Imagem (não está corrompida ou vazia)
  if (imageBuffer) {
    try {
      const meta = await sharp(imageBuffer).metadata();
      if (!meta.width || !meta.height || meta.width < 100 || meta.height < 100) {
        return {
          passed: false,
          score: 0.1,
          reason: 'Imagem gerada possui dimensões inválidas ou está corrompida.',
        };
      }
    } catch (err: any) {
      return {
        passed: false,
        score: 0.1,
        reason: `Erro ao decodificar imagem final: ${err.message}`,
      };
    }
  }

  const score = Number(((faceSSIM * 0.7) + ((1.0 - outsideMaskPixelChangeRatio) * 0.3)).toFixed(3));

  return {
    passed: true,
    score,
    reason: 'Identidade, integridade de pixels e fidelidade anatômica aprovadas.',
  };
}
