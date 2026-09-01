import zlib from 'zlib';
import type { MaskMode } from './types.ts';

export interface MaskGeneratorOptions {
  mode?: MaskMode;
  includeBeard?: boolean;
  hairCoverageTop?: number; // percentual do topo (padrão 0.32)
  hairlineArch?: number;    // curvatura da linha da testa (padrão 0.06)
}

/**
 * ZONA DE PROTEÇÃO FACIAL ESTRITA (FACE_PROTECTED_REGION)
 * Retorna true se a coordenada normalizada pertencer a regiões anatômicas vitais que NUNCA devem ser pintadas.
 */
export function isFaceProtectedRegion(
  normX: number, // 0 (esquerda) a 1 (direita)
  normY: number  // 0 (topo) a 1 (base)
): boolean {
  const distFromCenterX = Math.abs(normX - 0.5);

  // 1. Região dos Olhos e Sobrancelhas (Y: 24% a 44%, X: dentro de 65% da largura central)
  if (normY >= 0.24 && normY <= 0.44 && distFromCenterX <= 0.32) {
    return true;
  }

  // 2. Região do Nariz e Ponte Nasal (Y: 38% a 58%, X: dentro de 35% da largura central)
  if (normY >= 0.38 && normY <= 0.58 && distFromCenterX <= 0.18) {
    return true;
  }

  // 3. Região da Boca, Lábios e Dentes (Y: 56% a 74%, X: dentro de 40% da largura central)
  if (normY >= 0.56 && normY <= 0.74 && distFromCenterX <= 0.22) {
    return true;
  }

  // 4. Centro Facial Geral (Triângulo dos Olhos até a Boca)
  if (normY >= 0.26 && normY <= 0.74 && distFromCenterX <= 0.16) {
    return true;
  }

  return false;
}

/**
 * Cria um PNG monocromático (8-bit grayscale) em memória com máscara conservadora e proteção facial estrita.
 * Branco (255) = Área a ser editada pela IA (cabelo e/ou barba)
 * Preto (0)   = Área protegida (olhos, sobrancelhas, nariz, boca, pele facial central, fundo)
 */
export function generateHairMaskPNG(
  width: number = 768,
  height: number = 1024,
  options: MaskGeneratorOptions = {}
): Buffer {
  const mode: MaskMode = options.mode || (options.includeBeard ? 'HAIR_AND_BEARD' : 'HAIR_ONLY');
  const hairCoverageTop = options.hairCoverageTop || 0.32;
  const hairlineArch = options.hairlineArch || 0.06;

  const rowBytes = width + 1;
  const rawData = Buffer.alloc(height * rowBytes, 0);

  const centerX = width / 2;
  const hairBottomY = height * hairCoverageTop;
  const beardTopY = height * 0.76;
  const beardBottomY = height * 0.96;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter type 0 (None)
    const normY = y / height;

    for (let x = 0; x < width; x++) {
      const normX = x / width;
      let isMasked = false;

      // Se estiver na FACE_PROTECTED_REGION, força 0 (Preto / Protegido)
      if (!isFaceProtectedRegion(normX, normY)) {
        // 1. CABELO (HAIR_ONLY ou HAIR_AND_BEARD)
        if (mode === 'HAIR_ONLY' || mode === 'HAIR_AND_BEARD') {
          // Curva suave em arco sobre a testa (acima das sobrancelhas)
          const archOffset = Math.sin(Math.PI * Math.max(0, Math.min(1, normX))) * (height * hairlineArch);
          const currentHairLine = hairBottomY - archOffset;

          if (y < currentHairLine) {
            const distFromCenter = Math.abs(x - centerX);
            if (distFromCenter < width * 0.46) {
              isMasked = true;
            }
          } else if (y < height * 0.42) {
            // Têmporas laterais (sem invadir a testa central)
            const distFromCenter = Math.abs(x - centerX);
            if (distFromCenter > width * 0.30 && distFromCenter < width * 0.46) {
              isMasked = true;
            }
          }
        }

        // 2. BARBA (BEARD_ONLY ou HAIR_AND_BEARD)
        if (mode === 'BEARD_ONLY' || mode === 'HAIR_AND_BEARD') {
          if (y >= beardTopY && y <= beardBottomY) {
            const distFromCenter = Math.abs(x - centerX);
            // Queixo inferior e contorno do maxilar, protegendo a boca
            if (distFromCenter < width * 0.40 && y > height * 0.78) {
              isMasked = true;
            } else if (distFromCenter > width * 0.22 && distFromCenter < width * 0.40) {
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
  ihdrData.writeUInt8(8, 8); // 8 bits per pixel
  ihdrData.writeUInt8(0, 9); // Color type: 0 (Grayscale)
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
  height: number = 1024
): Buffer {
  return generateHairMaskPNG(width, height, { mode });
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
