import zlib from 'zlib';
import type { MaskMode } from './types.ts';
import type { FaceGeometry } from './face-detector.ts';
import type { FaceLandmarks } from './face-landmarks.ts';

export interface MaskGeneratorOptions {
  includeBeard?: boolean;
  mode?: MaskMode;
  geometry?: FaceGeometry;
  landmarks?: FaceLandmarks;
}

/**
 * Verifica se uma coordenada (normX, normY) está dentro da
 * ZONA DE PROTEÇÃO FACIAL INEGOCIÁVEL (Olhos, Nariz, Boca, Bochechas e Testa Central).
 * 
 * Retorna true se o pixel DEVE ser protegido (máscara = 0).
 */
export function isFaceProtectedRegion(
  normX: number,
  normY: number,
  geometry?: FaceGeometry,
  landmarks?: FaceLandmarks,
  mode: MaskMode = 'HAIR_ONLY'
): boolean {
  // 1. Prioridade para FaceLandmarks reais de alta precisão
  if (landmarks) {
    const x = normX * landmarks.imageWidth;
    const y = normY * landmarks.imageHeight;
    const fb = landmarks.faceBox;
    const centerX = fb.x + fb.width / 2;

    const le = landmarks.leftEye;
    const re = landmarks.rightEye;
    const eyeDistance = Math.max(30, Math.abs(re.centerX - le.centerX));
    const minEyeY = Math.min(le.centerY, re.centerY);

    // A. Olho Esquerdo e Sobrancelha Esquerda (100% protegido em TODOS os modos)
    if (
      Math.abs(x - le.centerX) <= eyeDistance * 0.42 &&
      Math.abs(y - le.centerY) <= eyeDistance * 0.35
    ) {
      return true;
    }

    // B. Olho Direito e Sobrancelha Direita (100% protegido em TODOS os modos)
    if (
      Math.abs(x - re.centerX) <= eyeDistance * 0.42 &&
      Math.abs(y - re.centerY) <= eyeDistance * 0.35
    ) {
      return true;
    }

    // C. Nariz (Ponte superior até a ponta e narinas)
    const nose = landmarks.nose;
    if (
      Math.abs(x - centerX) <= eyeDistance * 0.35 &&
      y >= minEyeY &&
      y <= nose.tipY
    ) {
      return true;
    }

    // D. Boca e Lábios internos (abertura da boca e lábios)
    const mouth = landmarks.mouth;
    if (
      Math.abs(x - centerX) <= Math.max(eyeDistance * 0.45, mouth.width * 0.55) &&
      y >= mouth.upperLipY &&
      y <= mouth.lowerLipY
    ) {
      return true;
    }

    // Se o modo incluir barba (BEARD_ONLY ou HAIR_AND_BEARD):
    // Liberamos a área do bigode, bochechas inferiores, mandíbula e queixo para estilização da barba
    if (mode === 'BEARD_ONLY' || mode === 'HAIR_AND_BEARD') {
      // Centro superior da face (entre olhos e topo do nariz) protegido
      if (y >= minEyeY - eyeDistance * 0.10 && y <= nose.tipY && Math.abs(x - centerX) <= eyeDistance * 0.60) {
        return true;
      }
      // Testa anatômica central protegida
      if (y >= landmarks.hairline.centerHairlineY && y <= minEyeY && Math.abs(x - centerX) <= eyeDistance * 0.65) {
        return true;
      }
      return false;
    }

    // Para modo HAIR_ONLY: Centro da Face e Bochechas protegidos
    if (
      y >= minEyeY - eyeDistance * 0.10 &&
      y <= mouth.lowerLipY + eyeDistance * 0.18 &&
      Math.abs(x - centerX) <= eyeDistance * 0.65
    ) {
      return true;
    }

    // F. Testa anatômica central (Abaixo da linha capilar e acima das sobrancelhas)
    if (y >= landmarks.hairline.centerHairlineY && y <= minEyeY) {
      if (Math.abs(x - centerX) <= eyeDistance * 0.65) {
        return true;
      }
    }

    return false;
  }

  // 2. Compatibilidade com FaceGeometry
  if (geometry) {
    const x = normX * geometry.imageWidth;
    const y = normY * geometry.imageHeight;
    const distFromCenterX = Math.abs(x - geometry.centerX);
    const eyeDist = Math.max(30, Math.abs(geometry.rightEyeX - geometry.leftEyeX));

    // Olhos e Sobrancelhas
    if (y >= geometry.eyeLineY - eyeDist * 0.35 && y <= geometry.eyeLineY + eyeDist * 0.25) {
      if (Math.abs(x - geometry.leftEyeX) <= eyeDist * 0.40 || Math.abs(x - geometry.rightEyeX) <= eyeDist * 0.40) {
        return true;
      }
    }

    // Nariz
    if (y >= geometry.eyeLineY && y <= geometry.noseTipY && distFromCenterX <= eyeDist * 0.35) {
      return true;
    }

    // Boca
    if (y >= geometry.mouthY - eyeDist * 0.10 && y <= geometry.mouthY + eyeDist * 0.10 && distFromCenterX <= eyeDist * 0.45) {
      return true;
    }

    if (mode !== 'BEARD_ONLY' && mode !== 'HAIR_AND_BEARD') {
      // Centro facial e testa central
      if (y >= geometry.eyeLineY - eyeDist * 0.30 && y <= geometry.mouthY + eyeDist * 0.20 && distFromCenterX <= eyeDist * 0.65) {
        return true;
      }
    }

    if (y >= geometry.hairlineY && y < geometry.eyeLineY - eyeDist * 0.25 && distFromCenterX <= eyeDist * 0.65) {
      return true;
    }

    return false;
  }

  // 3. Fallback genérico normalizado
  const distFromCenterX = Math.abs(normX - 0.5);
  if (normY >= 0.28 && normY <= 0.44 && distFromCenterX <= 0.30) return true;
  if (normY >= 0.38 && normY <= 0.58 && distFromCenterX <= 0.18) return true;
  if (normY >= 0.56 && normY <= 0.74 && distFromCenterX <= 0.22 && mode === 'HAIR_ONLY') return true;
  if (normY >= 0.28 && normY <= 0.74 && distFromCenterX <= 0.16 && mode === 'HAIR_ONLY') return true;

  return false;
}

/**
 * Gera um buffer PNG monocromático (8-bit grayscale) com compressão ZLIB nativa.
 * 
 * 255 (Branco) = Região autorizada para edição (cabelo ou barba)
 * 0   (Preto)  = Região 100% protegida (olhos, nariz, boca, pele facial, fundo e roupas)
 */
export function generateHairMaskPNG(
  width: number = 768,
  height: number = 1024,
  options: MaskGeneratorOptions = {}
): Buffer {
  const mode: MaskMode = options.mode || (options.includeBeard ? 'HAIR_AND_BEARD' : 'HAIR_ONLY');
  const geom = options.geometry;
  const lm = options.landmarks;

  const rowBytes = width + 1;
  const rawData = Buffer.alloc(height * rowBytes, 0);

  const leftEyeX = lm ? lm.leftEye.centerX : (geom ? geom.leftEyeX : width * 0.35);
  const rightEyeX = lm ? lm.rightEye.centerX : (geom ? geom.rightEyeX : width * 0.65);
  const eyeDistance = Math.max(30, Math.abs(rightEyeX - leftEyeX));

  const centerX = lm ? (leftEyeX + rightEyeX) / 2 : (geom ? geom.centerX : width / 2);
  const faceWidth = eyeDistance * 2.25;
  const eyeLineY = lm ? (lm.leftEye.centerY + lm.rightEye.centerY) / 2 : (geom ? geom.eyeLineY : height * 0.40);
  const hairlineY = lm ? lm.hairline.centerHairlineY : (geom ? geom.hairlineY : eyeLineY - eyeDistance * 0.85);
  const noseTipY = lm ? lm.nose.tipY : (geom ? geom.noseTipY : eyeLineY + eyeDistance * 0.60);
  const mouthY = lm ? lm.mouth.centerY : (geom ? geom.mouthY : eyeLineY + eyeDistance * 1.15);
  const upperLipY = lm ? lm.mouth.upperLipY : mouthY - eyeDistance * 0.12;
  const lowerLipY = lm ? lm.mouth.lowerLipY : mouthY + eyeDistance * 0.12;
  const chinY = lm ? lm.jawline.chinTipY : (geom ? geom.chinY : eyeLineY + eyeDistance * 1.65);

  const earLevelY = eyeLineY + eyeDistance * 0.55;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // PNG Filter 0 (None)
    const normY = y / height;

    for (let x = 0; x < width; x++) {
      const normX = x / width;
      let maskVal = 0;

      // Se for área protegida da face, força 0
      if (!isFaceProtectedRegion(normX, normY, geom, lm, mode)) {
        const distFromCenter = Math.abs(x - centerX);

        // 1. CABELO (HAIR_ONLY ou HAIR_AND_BEARD)
        if (mode === 'HAIR_ONLY' || mode === 'HAIR_AND_BEARD') {
          // A. Calota craniana completa, coroa, topete e topo da cabeça
          if (y < hairlineY) {
            maskVal = 255;
          }
          // B. Têmporas, fade, degradê, costeletas e laterais acima da orelha
          else if (y >= hairlineY && y <= earLevelY) {
            if (distFromCenter > eyeDistance * 0.65) {
              maskVal = 255;
            }
          }
          // C. Fundo lateral ao lado da cabeça
          else if (y > earLevelY && y <= chinY && distFromCenter > faceWidth * 0.65) {
            maskVal = 255;
          }
        }

        // 2. BARBA (BEARD_ONLY ou HAIR_AND_BEARD)
        if (mode === 'BEARD_ONLY' || mode === 'HAIR_AND_BEARD') {
          // A. Bigode (Mustache): entre a base do nariz e o lábio superior
          if (y >= noseTipY && y < upperLipY && distFromCenter <= eyeDistance * 0.65) {
            maskVal = 255;
          }
          // B. Queixo, cavanhaque, mandíbula inferior e pescoço
          else if (y > lowerLipY && y <= Math.min(height - 1, chinY + eyeDistance * 0.60)) {
            if (distFromCenter <= faceWidth * 0.80) {
              maskVal = 255;
            }
          }
          // C. Bochechas inferiores, costeletas em fade e laterais da mandíbula
          else if (y >= eyeLineY + eyeDistance * 0.35 && y <= chinY) {
            if (distFromCenter > eyeDistance * 0.35 && distFromCenter <= faceWidth * 0.80) {
              maskVal = 255;
            }
          }
        }
      }

      rawData[rowOffset + 1 + x] = maskVal;
    }
  }

  // Comprime com ZLIB nativo
  const compressed = zlib.deflateSync(rawData);

  // Constrói chunks PNG canônicos
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8 bits por canal
  ihdrData.writeUInt8(0, 9); // Grayscale
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  const ihdrChunk = createPNGChunk('IHDR', ihdrData);

  const idatChunk = createPNGChunk('IDAT', compressed);
  const iendChunk = createPNGChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

export function generateMaskByMode(
  mode: MaskMode,
  width: number = 768,
  height: number = 1024,
  geometry?: FaceGeometry,
  landmarks?: FaceLandmarks
): Buffer {
  return generateHairMaskPNG(width, height, { mode, geometry, landmarks });
}

function createPNGChunk(type: string, data: Buffer): Buffer {
  const length = data.length;
  const chunk = Buffer.alloc(12 + length);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = crc32(chunk.subarray(4, 8 + length));
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

const crcTable: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
