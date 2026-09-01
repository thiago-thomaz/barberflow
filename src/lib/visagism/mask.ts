import zlib from 'zlib';

/**
 * Cria um PNG monocromático (8-bit grayscale) em memória sem depender de pacotes binários nativos.
 * Branco (255) = Área a ser editada pela IA (cabelo / barba)
 * Preto (0)   = Área protegida (olhos, nariz, boca, pele facial, fundo)
 */
export function generateHairMaskPNG(
  width: number = 768,
  height: number = 1024,
  options: {
    includeBeard?: boolean;
    hairCoverageTop?: number; // percentual do topo (padrão 0.38)
    hairlineArch?: number;    // curvatura da linha da testa
  } = {}
): Buffer {
  const {
    includeBeard = false,
    hairCoverageTop = 0.38,
    hairlineArch = 0.08,
  } = options;

  // Matriz de pixels 1 byte por pixel (Grayscale)
  // Cada linha no PNG requer 1 byte de filtro no início (0 = None) + width bytes
  const rowBytes = width + 1;
  const rawData = Buffer.alloc(height * rowBytes, 0);

  const centerX = width / 2;
  const hairBottomY = height * hairCoverageTop;
  const beardTopY = height * 0.72;
  const beardBottomY = height * 0.95;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      let isMasked = false;

      // 1. Região do Cabelo (Topo da cabeça e têmporas)
      // Curva em arco sobre a testa para não invadir sobrancelhas/olhos
      const normalizedX = (x - centerX) / (width * 0.45); // -1 a 1
      const archOffset = Math.sin(Math.PI * Math.max(0, Math.min(1, (x / width)))) * (height * hairlineArch);
      const currentHairLine = hairBottomY - archOffset;

      if (y < currentHairLine) {
        // Cabelo topo e laterais superiores
        const distFromCenter = Math.abs(x - centerX);
        if (distFromCenter < width * 0.48) {
          isMasked = true;
        }
      } else if (y < height * 0.48) {
        // Têmporas e costeletas superiores (laterais, preservando centro do rosto)
        const distFromCenter = Math.abs(x - centerX);
        if (distFromCenter > width * 0.32 && distFromCenter < width * 0.48) {
          isMasked = true;
        }
      }

      // 2. Região da Barba (Opcional - apenas maxilar inferior e queixo, preservando boca)
      if (includeBeard && y >= beardTopY && y <= beardBottomY) {
        const distFromCenter = Math.abs(x - centerX);
        // Protege a boca e queixo superior
        if (y > height * 0.76 && distFromCenter < width * 0.42) {
          isMasked = true;
        } else if (distFromCenter > width * 0.22 && distFromCenter < width * 0.42) {
          isMasked = true;
        }
      }

      rawData[rowOffset + 1 + x] = isMasked ? 255 : 0;
    }
  }

  // Comprime os dados com ZLIB
  const compressed = zlib.deflateSync(rawData);

  // Monta arquivo PNG estruturado (IHDR, IDAT, IEND)
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk: width (4), height (4), bit depth (1), color type 0=grayscale (1), comp (1), filter (1), interlace (1)
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8 bits por canal
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
 * Utilitário para criar chunks PNG com CRC32
 */
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

/**
 * Tabela CRC32 rápida
 */
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
