import zlib from 'zlib';
import type { MaskMode } from './types.ts';
import type { FaceLandmarks } from './face-landmarks.ts';

export interface ExtendedMaskOptions {
  mode?: MaskMode;
  includeBeard?: boolean;
  geometry?: any;
  landmarks?: FaceLandmarks;
}

export type MaskGeneratorOptions = ExtendedMaskOptions;

/**
 * Verifica se uma coordenada (x, y) está dentro da ZONA DE PROTEÇÃO FACIAL ESTRITA.
 * A zona é calculada dinamicamente com base nos marcos anatômicos reais (FaceLandmarks).
 * 
 * Regiões 100% Protegidas:
 * 1. Olhos, Íris, Esclera e Pálpebras
 * 2. Sobrancelhas e Arco Supraciliar
 * 3. Ponte Nasal, Narinas e Ponta do Nariz
 * 4. Lábios, Boca, Filtro Labial e Dentes
 * 5. Centro Facial (Triângulo Ocular-Labial e Bochechas)
 */
export function isFaceProtectedRegion(
  normX: number,
  normY: number,
  geometry?: any,
  landmarks?: FaceLandmarks
): boolean {
  if (landmarks) {
    const x = normX * landmarks.imageWidth;
    const y = normY * landmarks.imageHeight;
    const fb = landmarks.faceBox;

    // Se estiver fora da caixa facial geral, não é a face
    if (x < fb.x || x > fb.x + fb.width || y < fb.y || y > fb.y + fb.height) {
      return false;
    }

    const distFromCenterX = Math.abs(x - landmarks.nose.tip.x);

    // 1. Olhos e Sobrancelhas (proteção estrita em torno dos olhos)
    const eyeCenterY = (landmarks.leftEye.y + landmarks.rightEye.y) / 2;
    const eyeTop = eyeCenterY - fb.height * 0.14;
    const eyeBottom = eyeCenterY + fb.height * 0.08;
    if (y >= eyeTop && y <= eyeBottom && distFromCenterX <= fb.width * 0.42) {
      return true;
    }

    // 2. Nariz e Dorso Nasal (dos olhos até abaixo da ponta do nariz)
    const noseTop = eyeCenterY + fb.height * 0.04;
    const noseBottom = landmarks.nose.tip.y + fb.height * 0.06;
    if (y >= noseTop && y <= noseBottom && distFromCenterX <= fb.width * 0.22) {
      return true;
    }

    // 3. Boca e Lábios (em torno do centro labial)
    const mouthTop = landmarks.mouth.upperLip.y - fb.height * 0.04;
    const mouthBottom = landmarks.mouth.lowerLip.y + fb.height * 0.06;
    if (y >= mouthTop && y <= mouthBottom && distFromCenterX <= fb.width * 0.28) {
      return true;
    }

    // 4. Centro Facial (área de pele entre olhos, bochechas e boca)
    if (y >= eyeTop && y <= mouthBottom && distFromCenterX <= fb.width * 0.22) {
      return true;
    }

    return false;
  }

  if (geometry) {
    const x = normX * geometry.imageWidth;
    const y = normY * geometry.imageHeight;
    const fb = geometry.faceBox;

    if (x < fb.x || x > fb.x + fb.width || y < fb.y || y > fb.y + fb.height) {
      return false;
    }

    const distFromCenterX = Math.abs(x - geometry.centerX);
    const eyeTop = geometry.eyeLineY - fb.height * 0.16;
    const eyeBottom = geometry.eyeLineY + fb.height * 0.10;
    if (y >= eyeTop && y <= eyeBottom && distFromCenterX <= fb.width * 0.40) return true;

    const noseTop = geometry.eyeLineY + fb.height * 0.05;
    const noseBottom = geometry.noseTipY + fb.height * 0.08;
    if (y >= noseTop && y <= noseBottom && distFromCenterX <= fb.width * 0.22) return true;

    const mouthTop = geometry.mouthY - fb.height * 0.12;
    const mouthBottom = geometry.mouthY + fb.height * 0.10;
    if (y >= mouthTop && y <= mouthBottom && distFromCenterX <= fb.width * 0.26) return true;

    if (y >= eyeTop && y <= mouthBottom && distFromCenterX <= fb.width * 0.20) return true;

    return false;
  }

  // Fallback normalizado caso nenhuma geometria esteja disponível
  const distFromCenterX = Math.abs(normX - 0.5);
  if (normY >= 0.24 && normY <= 0.44 && distFromCenterX <= 0.32) return true;
  if (normY >= 0.38 && normY <= 0.58 && distFromCenterX <= 0.18) return true;
  if (normY >= 0.56 && normY <= 0.74 && distFromCenterX <= 0.22) return true;
  if (normY >= 0.26 && normY <= 0.74 && distFromCenterX <= 0.16) return true;

  return false;
}

/**
 * Gera um buffer PNG monocromático (8-bit grayscale) com a máscara de inpainting adaptativa.
 * 
 * Branco (255) = Área a ser editada (cabelo ou barba conforme o modo)
 * Preto (0)   = Área rigorosamente protegida (olhos, nariz, boca, pele facial central)
 */
export function generateHairMaskPNG(
  width: number = 768,
  height: number = 1024,
  options: ExtendedMaskOptions = {}
): Buffer {
  const mode: MaskMode = options.mode || (options.includeBeard ? 'HAIR_AND_BEARD' : 'HAIR_ONLY');
  const geom = options.geometry;
  const lms = options.landmarks;

  const rowBytes = width + 1;
  const rawData = Buffer.alloc(height * rowBytes, 0);

  // Determina referências anatômicas
  const centerX = lms ? lms.nose.tip.x : geom ? geom.centerX : width / 2;
  const faceWidth = lms ? lms.faceBox.width : geom ? geom.faceBox.width : width * 0.56;
  const hairlineY = lms
    ? lms.forehead.y
    : geom
    ? geom.hairlineY
    : height * 0.26;
  const skullTopY = Math.max(0, lms ? Math.round(lms.faceBox.y - lms.faceBox.height * 0.25) : 0);
  const eyeLineY = lms ? (lms.leftEye.y + lms.rightEye.y) / 2 : geom ? geom.eyeLineY : height * 0.40;
  const mouthY = lms ? lms.mouth.center.y : geom ? geom.mouthY : height * 0.72;
  const chinY = lms ? lms.chin.y : geom ? geom.chinY : height * 0.88;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // PNG Filter Type 0 (None)
    const normY = y / height;

    for (let x = 0; x < width; x++) {
      const normX = x / width;
      let isMasked = false;

      // Se estiver na zona de proteção facial estrita, é 0 (Preto / 100% Intocável)
      if (!isFaceProtectedRegion(normX, normY, geom, lms)) {
        const distFromCenter = Math.abs(x - centerX);

        // 1. CABELO (HAIR_ONLY ou HAIR_AND_BEARD)
        if (mode === 'HAIR_ONLY' || mode === 'HAIR_AND_BEARD') {
          // Arco superior da testa acima das sobrancelhas
          const archHeight = Math.max(10, (hairlineY - skullTopY) * 0.20);
          const normalizedDist = Math.min(1.0, distFromCenter / (faceWidth * 0.55));
          const archOffset = Math.sin(Math.PI * normalizedDist) * archHeight;
          const currentHairline = hairlineY - archOffset;

          // Topo do crânio e fios superiores
          if (y >= skullTopY && y < currentHairline && distFromCenter < faceWidth * 0.65) {
            isMasked = true;
          } else if (y >= currentHairline && y < (eyeLineY - 15)) {
            // Têmporas e costeletas superiores (longe da testa central)
            if (distFromCenter > faceWidth * 0.32 && distFromCenter < faceWidth * 0.65) {
              isMasked = true;
            }
          }
        }

        // 2. BARBA (BEARD_ONLY ou HAIR_AND_BEARD)
        if (mode === 'BEARD_ONLY' || mode === 'HAIR_AND_BEARD') {
          const beardStartY = mouthY + Math.max(10, (chinY - mouthY) * 0.30);
          const beardEndY = Math.min(height - 1, chinY + (chinY - mouthY) * 0.45);

          if (y >= beardStartY && y <= beardEndY) {
            if (distFromCenter < faceWidth * 0.55) {
              isMasked = true;
            }
          } else if (y >= (lms ? lms.nose.tip.y : height * 0.55) && y < beardStartY) {
            // Laterais da barba (maxilar e costeletas inferiores)
            if (distFromCenter > faceWidth * 0.26 && distFromCenter < faceWidth * 0.58) {
              isMasked = true;
            }
          }
        }
      }

      rawData[rowOffset + 1 + x] = isMasked ? 255 : 0;
    }
  }

  // Compressão PNG padrão
  const compressed = zlib.deflateSync(rawData);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8);
  ihdrData.writeUInt8(0, 9);
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  const ihdrChunk = createPNGChunk('IHDR', ihdrData);

  const idatChunk = createPNGChunk('IDAT', compressed);
  const iendChunk = createPNGChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

/**
 * Cria máscara para um modo específico (HAIR_ONLY, BEARD_ONLY, HAIR_AND_BEARD)
 */
export function generateMaskByMode(
  mode: MaskMode,
  width: number = 768,
  height: number = 1024,
  geometry?: any,
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
