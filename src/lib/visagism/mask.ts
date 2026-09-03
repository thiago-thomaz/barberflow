import zlib from 'zlib';
import type { MaskMode } from './types.ts';
import type { FaceGeometry } from './face-detector.ts';

export interface MaskGeneratorOptions {
  mode?: MaskMode;
  includeBeard?: boolean;
  geometry?: FaceGeometry;
}

/**
 * Verifica se uma coordenada (x, y) está dentro da ZONA DE PROTEÇÃO FACIAL ESTRITA.
 * A zona é calculada dinamicamente a partir dos marcos da FaceGeometry.
 * 
 * Regiões 100% Protegidas:
 * 1. Olhos e Sobrancelhas
 * 2. Ponte Nasal e Nariz
 * 3. Lábios, Boca e Dentes
 * 4. Centro Facial (Triângulo Ocular-Labial)
 */
export function isFaceProtectedRegion(
  normX: number,
  normY: number,
  geometry?: FaceGeometry
): boolean {
  if (geometry) {
    const x = normX * geometry.imageWidth;
    const y = normY * geometry.imageHeight;
    const fb = geometry.faceBox;

    // Se estiver fora da caixa facial geral, não é o núcleo do rosto
    if (x < fb.x || x > fb.x + fb.width || y < fb.y || y > fb.y + fb.height) {
      return false;
    }

    const distFromCenterX = Math.abs(x - geometry.centerX);

    // 1. Olhos e Sobrancelhas (faixa vertical em torno da linha dos olhos)
    const eyeTop = geometry.eyeLineY - fb.height * 0.16;
    const eyeBottom = geometry.eyeLineY + fb.height * 0.10;
    if (y >= eyeTop && y <= eyeBottom && distFromCenterX <= fb.width * 0.40) {
      return true;
    }

    // 2. Nariz e Dorso Nasal (entre os olhos e a ponta do nariz)
    const noseTop = geometry.eyeLineY + fb.height * 0.05;
    const noseBottom = geometry.noseTipY + fb.height * 0.08;
    if (y >= noseTop && y <= noseBottom && distFromCenterX <= fb.width * 0.22) {
      return true;
    }

    // 3. Boca, Lábios e Dentes (em torno da linha da boca)
    const mouthTop = geometry.mouthY - fb.height * 0.12;
    const mouthBottom = geometry.mouthY + fb.height * 0.10;
    if (y >= mouthTop && y <= mouthBottom && distFromCenterX <= fb.width * 0.26) {
      return true;
    }

    // 4. Centro Facial Geral (pele central entre olhos e boca)
    if (y >= eyeTop && y <= mouthBottom && distFromCenterX <= fb.width * 0.20) {
      return true;
    }

    return false;
  }

  // Fallback para coordenadas normalizadas caso geometria não esteja presente
  const distFromCenterX = Math.abs(normX - 0.5);

  // Olhos e Sobrancelhas
  if (normY >= 0.24 && normY <= 0.44 && distFromCenterX <= 0.32) return true;
  // Nariz
  if (normY >= 0.38 && normY <= 0.58 && distFromCenterX <= 0.18) return true;
  // Boca e lábios
  if (normY >= 0.56 && normY <= 0.74 && distFromCenterX <= 0.22) return true;
  // Centro facial
  if (normY >= 0.26 && normY <= 0.74 && distFromCenterX <= 0.16) return true;

  return false;
}

/**
 * Gera um buffer PNG monocromático (8-bit grayscale) com a máscara de inpainting.
 * 
 * Branco (255) = Área a ser editada (cabelo ou barba conforme o modo)
 * Preto (0)   = Área rigorosamente protegida (olhos, nariz, boca, pele, fundo)
 */
export function generateHairMaskPNG(
  width: number = 768,
  height: number = 1024,
  options: MaskGeneratorOptions = {}
): Buffer {
  const mode: MaskMode = options.mode || (options.includeBeard ? 'HAIR_AND_BEARD' : 'HAIR_ONLY');
  const geom = options.geometry;

  const rowBytes = width + 1;
  const rawData = Buffer.alloc(height * rowBytes, 0);

  // Parâmetros dinâmicos ou proporcionais
  const centerX = geom ? geom.centerX : width / 2;
  const hairlineY = geom ? geom.hairlineY : height * 0.28;
  const skullTopY = geom ? geom.skullTopY : Math.max(0, height * 0.04);
  const mouthY = geom ? geom.mouthY : height * 0.70;
  const chinY = geom ? geom.chinY : height * 0.88;
  const faceWidth = geom ? geom.faceBox.width : width * 0.56;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // PNG Filter Type 0 (None)
    const normY = y / height;

    for (let x = 0; x < width; x++) {
      const normX = x / width;
      let isMasked = false;

      // Se a coordenada estiver na Face Protected Region, ela é 0 (Preto / 100% Protegido)
      if (!isFaceProtectedRegion(normX, normY, geom)) {
        const distFromCenter = Math.abs(x - centerX);

        // 1. CABELO (HAIR_ONLY ou HAIR_AND_BEARD)
        if (mode === 'HAIR_ONLY' || mode === 'HAIR_AND_BEARD') {
          // Arco superior da testa acima da linha dos olhos/sobrancelhas
          const archHeight = (hairlineY - skullTopY) * 0.25;
          const normalizedDist = Math.min(1.0, distFromCenter / (faceWidth * 0.55));
          const archOffset = Math.sin(Math.PI * normalizedDist) * archHeight;
          const currentHairline = hairlineY - archOffset;

          // Região do topo da cabeça e transição do corte
          if (y >= skullTopY && y < currentHairline && distFromCenter < faceWidth * 0.65) {
            isMasked = true;
          } else if (y >= currentHairline && y < (geom ? geom.eyeLineY - 10 : height * 0.35)) {
            // Têmporas e costeletas superiores (sem invadir a testa central)
            if (distFromCenter > faceWidth * 0.34 && distFromCenter < faceWidth * 0.65) {
              isMasked = true;
            }
          }
        }

        // 2. BARBA (BEARD_ONLY ou HAIR_AND_BEARD)
        if (mode === 'BEARD_ONLY' || mode === 'HAIR_AND_BEARD') {
          // A barba começa abaixo do lábio inferior ou nas laterais do maxilar
          const beardStartY = mouthY + (chinY - mouthY) * 0.35;
          const beardEndY = Math.min(height - 1, chinY + (chinY - mouthY) * 0.50);

          if (y >= beardStartY && y <= beardEndY) {
            // Região do queixo e mandíbula inferior
            if (distFromCenter < faceWidth * 0.55) {
              isMasked = true;
            }
          } else if (y >= (geom ? geom.noseTipY : height * 0.55) && y < beardStartY) {
            // Laterais da barba (bochechas externas e costeletas), longe do nariz e lábios
            if (distFromCenter > faceWidth * 0.28 && distFromCenter < faceWidth * 0.58) {
              isMasked = true;
            }
          }
        }
      }

      rawData[rowOffset + 1 + x] = isMasked ? 255 : 0;
    }
  }

  // Comprime com ZLIB
  const compressed = zlib.deflateSync(rawData);

  // Assinatura PNG
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8 bits por pixel
  ihdrData.writeUInt8(0, 9); // Grayscale
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  const ihdrChunk = createPNGChunk('IHDR', ihdrData);

  // IDAT chunk
  const idatChunk = createPNGChunk('IDAT', compressed);

  // IEND chunk
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
  geometry?: FaceGeometry
): Buffer {
  return generateHairMaskPNG(width, height, { mode, geometry });
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
