import sharp from 'sharp';
import { extractFaceLandmarks, type FaceLandmarks } from './face-landmarks.ts';

export interface IdentityGateInput {
  originalBuffer: Buffer;
  generatedRawBuffer: Buffer;
  maskBuffer: Buffer;
  minIdentitySimilarity?: number;
}

export interface IdentityGateResult {
  passed: boolean;
  identityScore: number;
  faceDetectedInRaw: boolean;
  boxShiftRatio: number;
  featureDistance: number;
  reason?: string;
  originalLandmarks: FaceLandmarks;
  generatedLandmarks?: FaceLandmarks;
}

export const MIN_IDENTITY_SIMILARITY_THRESHOLD = 0.65; // 65% mínimo de fidelidade biométrica em inpainting natural

/**
 * Valida a preservação de identidade na imagem gerada pela IA ANTES da composição.
 * Compara características anatômicas reais, posição de olhos/nariz/boca e proporção facial.
 */
export async function validateIdentityGate(
  input: IdentityGateInput
): Promise<IdentityGateResult> {
  const {
    originalBuffer,
    generatedRawBuffer,
    minIdentitySimilarity = MIN_IDENTITY_SIMILARITY_THRESHOLD,
  } = input;

  // 1. Extrai marcos da foto original
  const origMeta = await sharp(originalBuffer).metadata();
  const width = origMeta.width || 768;
  const height = origMeta.height || 1024;

  const origLM = await extractFaceLandmarks(originalBuffer, width, height);

  // 2. Extrai marcos da imagem RAW gerada pela IA
  let genLM: FaceLandmarks | undefined = undefined;
  let faceDetectedInRaw = false;

  try {
    genLM = await extractFaceLandmarks(generatedRawBuffer, width, height);
    faceDetectedInRaw = genLM.confidence >= 0.70;
  } catch (e) {
    faceDetectedInRaw = false;
  }

  if (!faceDetectedInRaw || !genLM) {
    return {
      passed: false,
      identityScore: 0.0,
      faceDetectedInRaw: false,
      boxShiftRatio: 1.0,
      featureDistance: 1.0,
      reason: 'Rosto não identificado com nitidez suficiente na imagem gerada pela IA.',
      originalLandmarks: origLM,
    };
  }

  // 3. Verifica deslocamento da caixa facial (Box Shift)
  const origBox = origLM.faceBox;
  const genBox = genLM.faceBox;

  const shiftX = Math.abs((origBox.x + origBox.width / 2) - (genBox.x + genBox.width / 2)) / width;
  const shiftY = Math.abs((origBox.y + origBox.height / 2) - (genBox.y + genBox.height / 2)) / height;
  const scaleDiff = Math.abs(origBox.width - genBox.width) / origBox.width;

  const boxShiftRatio = Math.sqrt(shiftX * shiftX + shiftY * shiftY) + scaleDiff * 0.5;

  // 4. Distância dos marcos anatômicos (Olhos, Nariz, Boca)
  const leftEyeDist = Math.hypot(
    (origLM.leftEye.centerX - genLM.leftEye.centerX) / width,
    (origLM.leftEye.centerY - genLM.leftEye.centerY) / height
  );

  const rightEyeDist = Math.hypot(
    (origLM.rightEye.centerX - genLM.rightEye.centerX) / width,
    (origLM.rightEye.centerY - genLM.rightEye.centerY) / height
  );

  const noseDist = Math.hypot(
    (origLM.nose.tipX - genLM.nose.tipX) / width,
    (origLM.nose.tipY - genLM.nose.tipY) / height
  );

  const mouthDist = Math.hypot(
    (origLM.mouth.centerX - genLM.mouth.centerX) / width,
    (origLM.mouth.centerY - genLM.mouth.centerY) / height
  );

  const featureDistance = (leftEyeDist + rightEyeDist + noseDist + mouthDist) / 4;

  // 5. Cálculo do Score de Similaridade de Identidade (0 a 1)
  // Penaliza se a caixa do rosto ou os marcos tiverem se movido
  let score = 1.0 - (boxShiftRatio * 0.6 + featureDistance * 1.5);
  score = Math.max(0.0, Math.min(1.0, score));

  // 6. Verificação de Regras Eliminatórias
  if (boxShiftRatio > 0.35) {
    return {
      passed: false,
      identityScore: Math.round(score * 100) / 100,
      faceDetectedInRaw: true,
      boxShiftRatio: Math.round(boxShiftRatio * 100) / 100,
      featureDistance: Math.round(featureDistance * 100) / 100,
      reason: 'A IA alterou o posicionamento ou a estrutura geométrica do rosto.',
      originalLandmarks: origLM,
      generatedLandmarks: genLM,
    };
  }

  if (featureDistance > 0.25) {
    return {
      passed: false,
      identityScore: Math.round(score * 100) / 100,
      faceDetectedInRaw: true,
      boxShiftRatio: Math.round(boxShiftRatio * 100) / 100,
      featureDistance: Math.round(featureDistance * 100) / 100,
      reason: 'A IA deslocou os olhos, nariz ou boca em relação à sua foto original.',
      originalLandmarks: origLM,
      generatedLandmarks: genLM,
    };
  }

  const passed = score >= minIdentitySimilarity;

  return {
    passed,
    identityScore: Math.round(score * 100) / 100,
    faceDetectedInRaw: true,
    boxShiftRatio: Math.round(boxShiftRatio * 100) / 100,
    featureDistance: Math.round(featureDistance * 100) / 100,
    reason: passed
      ? undefined
      : `Similaridade biométrica da IA (${Math.round(score * 100)}%) abaixo do limiar de ${Math.round(minIdentitySimilarity * 100)}%.`,
    originalLandmarks: origLM,
    generatedLandmarks: genLM,
  };
}
