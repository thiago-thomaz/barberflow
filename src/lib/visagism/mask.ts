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
 * Verifica se uma coordenada (normX, normY) ou pixel (x, y) está dentro da
 * ZONA DE PROTEÇÃO FACIAL INEGOCIÁVEL (Olhos, Nariz, Boca, Centro da Face e Testa).
 * 
 * Retorna true se a coordenada DEVE ser protegida (máscara = 0).
 */
export function isFaceProtectedRegion(
  normX: number,
  normY: number,
  geometry?: FaceGeometry,
  landmarks?: FaceLandmarks
): boolean {
  // 1. Prioridade para FaceLandmarks reais de alta precisão
  if (landmarks) {
    const x = normX * landmarks.imageWidth;
    const y = normY * landmarks.imageHeight;
    const fb = landmarks.faceBox;

    // Se estiver totalmente fora da caixa da face, não é o núcleo
    if (x < fb.x || x > fb.x + fb.width || y < fb.y || y > fb.y + fb.height) {
      return false;
    }

    // A. Olho Esquerdo (com margem de segurança)
    const le = landmarks.leftEye;
    if (
      x >= le.centerX - le.width * 0.8 &&
      x <= le.centerX + le.width * 0.8 &&
      y >= le.centerY - le.height * 0.9 &&
      y <= le.centerY + le.height * 0.9
    ) {
      return true;
    }

    // B. Olho Direito (com margem de segurança)
    const re = landmarks.rightEye;
    if (
      x >= re.centerX - re.width * 0.8 &&
      x <= re.centerX + re.width * 0.8 &&
      y >= re.centerY - re.height * 0.9 &&
      y <= re.centerY + re.height * 0.9
    ) {
      return true;
    }

    // C. Nariz (Ponte até a ponta e narinas)
    const nose = landmarks.nose;
    if (
      x >= nose.leftNostrilX - fb.width * 0.05 &&
      x <= nose.rightNostrilX + fb.width * 0.05 &&
      y >= nose.bridgeTopY - fb.height * 0.03 &&
      y <= nose.tipY + fb.height * 0.05
    ) {
      return true;
    }

    // D. Boca e Lábios (Lábio superior ao inferior com cantos)
    const mouth = landmarks.mouth;
    if (
      x >= mouth.leftCornerX - fb.width * 0.05 &&
      x <= mouth.rightCornerX + fb.width * 0.05 &&
      y >= mouth.upperLipY - fb.height * 0.03 &&
      y <= mouth.lowerLipY + fb.height * 0.03
    ) {
      return true;
    }

    // E. Centro da Face (Pele central entre olhos e boca)
    const minEyeY = Math.min(le.centerY, re.centerY);
    if (
      y >= minEyeY &&
      y <= mouth.upperLipY &&
      Math.abs(x - landmarks.faceBox.x - landmarks.faceBox.width / 2) <= fb.width * 0.22
    ) {
      return true;
    }

    // F. Testa anatômica (Abaixo do início real do cabelo)
    if (y >= landmarks.hairline.centerHairlineY && y < minEyeY) {
      if (
        x >= landmarks.forehead.leftX - fb.width * 0.05 &&
        x <= landmarks.forehead.rightX + fb.width * 0.05
      ) {
        return true;
      }
    }

    return false;
  }

  // 2. Compatibilidade com FaceGeometry
  if (geometry) {
    const x = normX * geometry.imageWidth;
    const y = normY * geometry.imageHeight;
    const fb = geometry.faceBox;

    if (x < fb.x || x > fb.x + fb.width || y < fb.y || y > fb.y + fb.height) {
      return false;
    }

    const distFromCenterX = Math.abs(x - geometry.centerX);

    // Olhos e Sobrancelhas
    const eyeTop = geometry.eyeLineY - fb.height * 0.16;
    const eyeBottom = geometry.eyeLineY + fb.height * 0.10;
    if (y >= eyeTop && y <= eyeBottom && distFromCenterX <= fb.width * 0.40) {
      return true;
    }

    // Nariz
    const noseTop = geometry.eyeLineY + fb.height * 0.05;
    const noseBottom = geometry.noseTipY + fb.height * 0.08;
    if (y >= noseTop && y <= noseBottom && distFromCenterX <= fb.width * 0.22) {
      return true;
    }

    // Boca
    const mouthTop = geometry.mouthY - fb.height * 0.12;
    const mouthBottom = geometry.mouthY + fb.height * 0.10;
    if (y >= mouthTop && y <= mouthBottom && distFromCenterX <= fb.width * 0.26) {
      return true;
    }

    // Centro facial
    if (y >= eyeTop && y <= mouthBottom && distFromCenterX <= fb.width * 0.20) {
      return true;
    }

    return false;
  }

  // 3. Fallback genérico normalizado
  const distFromCenterX = Math.abs(normX - 0.5);
  if (normY >= 0.24 && normY <= 0.44 && distFromCenterX <= 0.32) return true;
  if (normY >= 0.38 && normY <= 0.58 && distFromCenterX <= 0.18) return true;
  if (normY >= 0.56 && normY <= 0.74 && distFromCenterX <= 0.22) return true;
  if (normY >= 0.26 && normY <= 0.74 && distFromCenterX <= 0.16) return true;

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

  const centerX = lm ? (lm.faceBox.x + lm.faceBox.width / 2) : (geom ? geom.centerX : width / 2);
  const faceWidth = lm ? lm.faceBox.width : (geom ? geom.faceBox.width : width * 0.56);
  const faceHeight = lm ? lm.faceBox.height : (geom ? geom.faceBox.height : height * 0.52);
  const hairlineY = lm ? lm.hairline.centerHairlineY : (geom ? geom.hairlineY : height * 0.28);
  const eyeLineY = lm ? Math.min(lm.leftEye.centerY, lm.rightEye.centerY) : (geom ? geom.eyeLineY : height * 0.38);
  const mouthY = lm ? lm.mouth.lowerLipY : (geom ? geom.mouthY : height * 0.70);
  const chinY = lm ? lm.jawline.chinTipY : (geom ? geom.chinY : height * 0.88);

  const halfWidth = Math.max(20, faceWidth * 0.5);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // PNG Filter 0 (None)
    const normY = y / height;

    for (let x = 0; x < width; x++) {
      const normX = x / width;
      let maskVal = 0;

      // Se for área protegida da face, força 0
      if (!isFaceProtectedRegion(normX, normY, geom, lm)) {
        const distFromCenter = Math.abs(x - centerX);
        const normDist = distFromCenter / halfWidth;

        // 1. CABELO (HAIR_ONLY ou HAIR_AND_BEARD)
        if (mode === 'HAIR_ONLY' || mode === 'HAIR_AND_BEARD') {
          // Arco anatômico contínuo da linha capilar:
          // No centro (x = centerX), a linha fica em hairlineY.
          // Conforme afasta para as têmporas (normDist -> 1.0), desce suavemente em direção às orelhas/costeletas.
          const archOffset = (eyeLineY - hairlineY) * Math.pow(Math.min(1.2, normDist), 2) * 0.85;
          const localHairlineY = hairlineY + archOffset;

          // Limite craniano superior e lateral (permite volume natural de fade, pompadour e textura)
          const maxHairWidth = faceWidth * 0.78;

          if (y < localHairlineY && distFromCenter <= maxHairWidth) {
            // Região de cabelo do topo e crânio
            const boundaryDist = localHairlineY - y;
            if (boundaryDist < 3) {
              maskVal = Math.round(180 + (boundaryDist / 3) * 75);
            } else {
              maskVal = 255;
            }
          } else if (y >= localHairlineY && y < eyeLineY + 10) {
            // Têmporas laterais e costeletas superiores (sem invadir a testa central)
            if (distFromCenter > faceWidth * 0.30 && distFromCenter <= maxHairWidth) {
              maskVal = 255;
            }
          }
        }

        // 2. BARBA (BEARD_ONLY ou HAIR_AND_BEARD)
        if (mode === 'BEARD_ONLY' || mode === 'HAIR_AND_BEARD') {
          // A barba começa abaixo do lábio inferior
          const beardStartY = mouthY + 4;
          const beardEndY = Math.min(height - 1, chinY + (chinY - mouthY) * 0.50);

          if (y >= beardStartY && y <= beardEndY) {
            // Queixo, mandíbula inferior e pescoço superior
            if (distFromCenter <= faceWidth * 0.62) {
              maskVal = 255;
            }
          } else if (y >= (lm ? lm.nose.tipY : height * 0.52) && y < beardStartY) {
            // Costeletas inferiores e bochechas externas (longe dos lábios e nariz)
            if (distFromCenter > faceWidth * 0.26 && distFromCenter <= faceWidth * 0.62) {
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
