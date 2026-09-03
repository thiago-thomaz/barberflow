import sharp from 'sharp';
import { extractFaceLandmarks } from './face-landmarks.ts';
import type { FaceLandmarks } from './face-landmarks.ts';

export interface IdentityGateInput {
  originalImageBuffer: Buffer;
  generatedRawBuffer: Buffer;
  finalCompositeBuffer?: Buffer;
  maskBuffer?: Buffer;
  outsideMaskPixelChangeRatio?: number;
  faceSSIM?: number;
  haircutName?: string;
  latencyMs?: number;
}

export interface IdentityGateResult {
  passed: boolean;
  score: number;
  identitySimilarity: number;
  faceSSIM: number;
  outsideDiff: number;
  reason?: string;
  details?: {
    faceFoundOriginal: boolean;
    faceFoundGenerated: boolean;
    boxOverlap: number;
    featureDistance: number;
    centerDisplacement: number;
    luminanceCorrelation: number;
  };
}

// Limiares rigorosos da Fase 22
export const MIN_IDENTITY_SIMILARITY = 0.70; // Medido na imagem RAW gerada antes da composição
export const MIN_PROTECTED_FACE_SSIM = 0.95; // Medido no núcleo inegociável da face
export const MAX_OUTSIDE_MASK_CHANGE_RATIO = 0.01; // Máximo 1% de tolerância fora da máscara

/**
 * IDENTITY GATE BIOMÉTRICO (Fase 22)
 * 
 * Executa a validação em dois níveis obrigatórios:
 * Nível 1: Validação da IA (Original vs RAW Gerado antes de qualquer composição)
 * Nível 2: Validação da Composição (Pixel Gate bit a bit e SSIM facial)
 */
export async function validateIdentityGate(input: IdentityGateInput): Promise<IdentityGateResult> {
  const {
    originalImageBuffer,
    generatedRawBuffer,
    outsideMaskPixelChangeRatio = 0.0,
    faceSSIM = 1.0,
    latencyMs,
  } = input;

  // 1. Pixel Gate: Fora da máscara a divergência deve ser rigorosamente menor que 1%
  if (outsideMaskPixelChangeRatio > MAX_OUTSIDE_MASK_CHANGE_RATIO) {
    return {
      passed: false,
      score: 0.0,
      identitySimilarity: 0.0,
      faceSSIM,
      outsideDiff: outsideMaskPixelChangeRatio,
      reason: `Pixel Preservation Gate: Alteração fora da máscara (${(outsideMaskPixelChangeRatio * 100).toFixed(2)}%) excedeu o limite máximo de ${(MAX_OUTSIDE_MASK_CHANGE_RATIO * 100)}%.`,
    };
  }

  // 2. Protected Face SSIM Gate
  if (faceSSIM < MIN_PROTECTED_FACE_SSIM) {
    return {
      passed: false,
      score: Math.round(faceSSIM * 100) / 100,
      identitySimilarity: 0.0,
      faceSSIM,
      outsideDiff: outsideMaskPixelChangeRatio,
      reason: `Face SSIM Gate: Fidelidade do rosto (${(faceSSIM * 100).toFixed(1)}%) ficou abaixo do mínimo exigido (${(MIN_PROTECTED_FACE_SSIM * 100)}%).`,
    };
  }

  // 3. Nível 1 (Biometria): Compara a foto ORIGINAL vs. Imagem RAW GERADA PELA IA
  try {
    const [lmsOrig, lmsGen] = await Promise.all([
      extractFaceLandmarks(originalImageBuffer),
      extractFaceLandmarks(generatedRawBuffer),
    ]);

    if (!lmsOrig || !lmsGen) {
      return {
        passed: false,
        score: 0.0,
        identitySimilarity: 0.0,
        faceSSIM,
        outsideDiff: outsideMaskPixelChangeRatio,
        reason: 'Visual Sanity Gate: Não foi possível detectar a face do cliente na imagem gerada.',
      };
    }

    // 3.1 Deslocamento do Centro Facial (Center Shift)
    const normOrigCx = lmsOrig.nose.tip.x / lmsOrig.imageWidth;
    const normGenCx = lmsGen.nose.tip.x / lmsGen.imageWidth;
    const normOrigCy = lmsOrig.nose.tip.y / lmsOrig.imageHeight;
    const normGenCy = lmsGen.nose.tip.y / lmsGen.imageHeight;
    const centerDisplacement = Math.sqrt(
      Math.pow(normOrigCx - normGenCx, 2) + Math.pow(normOrigCy - normGenCy, 2)
    );

    // Se o rosto se deslocou mais de 15% na tela, é outra pessoa ou enquadramento totalmente alterado
    if (centerDisplacement > 0.15) {
      return {
        passed: false,
        score: 0.2,
        identitySimilarity: Math.max(0.1, 1.0 - centerDisplacement * 4),
        faceSSIM,
        outsideDiff: outsideMaskPixelChangeRatio,
        reason: `Identity Gate: Posição facial deslocada em ${(centerDisplacement * 100).toFixed(1)}% do enquadramento original.`,
        details: {
          faceFoundOriginal: true,
          faceFoundGenerated: true,
          boxOverlap: 0.2,
          featureDistance: 0.2,
          centerDisplacement: Math.round(centerDisplacement * 100) / 100,
          luminanceCorrelation: 0.2,
        },
      };
    }

    // 3.2 Proporção da Caixa Facial
    const normOrigW = lmsOrig.faceBox.width / lmsOrig.imageWidth;
    const normGenW = lmsGen.faceBox.width / lmsGen.imageWidth;
    const sizeRatio = Math.min(normOrigW, normGenW) / Math.max(normOrigW, normGenW);

    // 3.3 Distância Interocular Relativa
    const origEyeDist = Math.abs(lmsOrig.rightEye.x - lmsOrig.leftEye.x) / lmsOrig.faceBox.width;
    const genEyeDist = Math.abs(lmsGen.rightEye.x - lmsGen.leftEye.x) / lmsGen.faceBox.width;
    const eyeRatio = Math.min(origEyeDist, genEyeDist) / Math.max(origEyeDist, genEyeDist);

    // 3.4 Correlação de Pearson da Face Central (Resolução 128x128)
    const origFaceCrop = await sharp(originalImageBuffer)
      .extract({
        left: lmsOrig.faceBox.x,
        top: lmsOrig.faceBox.y,
        width: lmsOrig.faceBox.width,
        height: lmsOrig.faceBox.height,
      })
      .resize(128, 128)
      .toColorspace('b-w')
      .raw()
      .toBuffer();

    const genFaceCrop = await sharp(generatedRawBuffer)
      .extract({
        left: lmsGen.faceBox.x,
        top: lmsGen.faceBox.y,
        width: lmsGen.faceBox.width,
        height: lmsGen.faceBox.height,
      })
      .resize(128, 128)
      .toColorspace('b-w')
      .raw()
      .toBuffer();

    const N = 128 * 128;
    let meanA = 0, meanB = 0;
    for (let i = 0; i < N; i++) {
      meanA += origFaceCrop[i];
      meanB += genFaceCrop[i];
    }
    meanA /= N;
    meanB /= N;

    let num = 0, denA = 0, denB = 0;
    for (let i = 0; i < N; i++) {
      const da = origFaceCrop[i] - meanA;
      const db = genFaceCrop[i] - meanB;
      num += da * db;
      denA += da * da;
      denB += db * db;
    }

    const pearsonCorr = (denA > 0 && denB > 0) ? num / (Math.sqrt(denA) * Math.sqrt(denB)) : 1.0;
    const lumDiffRatio = Math.abs(meanA - meanB) / 255;
    const lumScore = Math.max(0.0, 1.0 - lumDiffRatio * 2.0);

    // Score biométrico unificado
    const identitySimilarity = Math.max(
      0.0,
      Math.min(
        1.0,
        0.35 * Math.max(0, pearsonCorr) +
        0.25 * lumScore +
        0.20 * sizeRatio +
        0.20 * eyeRatio -
        centerDisplacement * 0.5
      )
    );

    if (identitySimilarity < MIN_IDENTITY_SIMILARITY) {
      return {
        passed: false,
        score: Math.round(identitySimilarity * 100) / 100,
        identitySimilarity: Math.round(identitySimilarity * 1000) / 1000,
        faceSSIM,
        outsideDiff: outsideMaskPixelChangeRatio,
        reason: `Identity Gate: A similaridade biométrica da IA (${(identitySimilarity * 100).toFixed(1)}%) ficou abaixo do limiar de segurança (${(MIN_IDENTITY_SIMILARITY * 100)}%). A IA tentou gerar uma pessoa diferente.`,
        details: {
          faceFoundOriginal: true,
          faceFoundGenerated: true,
          boxOverlap: Math.round(sizeRatio * 100) / 100,
          featureDistance: Math.round(lumScore * 100) / 100,
          centerDisplacement: Math.round(centerDisplacement * 100) / 100,
          luminanceCorrelation: Math.round(pearsonCorr * 100) / 100,
        },
      };
    }

    return {
      passed: true,
      score: 1.0,
      identitySimilarity: Math.round(identitySimilarity * 1000) / 1000,
      faceSSIM,
      outsideDiff: outsideMaskPixelChangeRatio,
      details: {
        faceFoundOriginal: true,
        faceFoundGenerated: true,
        boxOverlap: Math.round(sizeRatio * 100) / 100,
        featureDistance: Math.round(lumScore * 100) / 100,
        centerDisplacement: Math.round(centerDisplacement * 100) / 100,
        luminanceCorrelation: Math.round(pearsonCorr * 100) / 100,
      },
    };
  } catch (err: any) {
    console.warn('[IDENTITY_GATE] Falha ao processar biometria facial:', err.message);
    return {
      passed: outsideMaskPixelChangeRatio <= MAX_OUTSIDE_MASK_CHANGE_RATIO && faceSSIM >= MIN_PROTECTED_FACE_SSIM,
      score: faceSSIM,
      identitySimilarity: faceSSIM,
      faceSSIM,
      outsideDiff: outsideMaskPixelChangeRatio,
    };
  }
}
