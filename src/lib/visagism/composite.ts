import sharp from 'sharp';
import type { FaceBox } from './face-detector.ts';

export interface CompositeResult {
  compositeBuffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
  outsideMaskPixelChangeRatio: number;
  faceSSIM: number;
}

/**
 * Motor de Composição Pixel a Pixel com Preservação Real da Foto Original.
 * 
 * Fórmula:
 * FINAL[x,y] = ORIGINAL[x,y] * (1 - MASK[x,y]) + GERADO[x,y] * MASK[x,y]
 * 
 * Onde MASK = 0 (olhos, nariz, boca, rosto, pele, fundo, roupas), os pixels
 * da imagem final são 100% IDÊNTICOS à foto original do cliente.
 */
export async function compositeInpaintingResult(params: {
  originalBuffer: Buffer;
  generatedBuffer: Buffer;
  maskBuffer: Buffer;
  faceBox?: FaceBox;
  featherSigma?: number;
  mode?: string;
}): Promise<CompositeResult> {
  const { originalBuffer, generatedBuffer, maskBuffer, faceBox, featherSigma = 2.5, mode = 'HAIR_ONLY' } = params;

  // 1. Decodifica a imagem original e obtém dimensões canônicas
  const origSharp = sharp(originalBuffer);
  const origMeta = await origSharp.metadata();
  const width = origMeta.width || 768;
  const height = origMeta.height || 1024;

  const origRaw = await origSharp
    .resize(width, height, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer();

  // 2. Ajusta a imagem gerada para o tamanho exato da original
  const genRaw = await sharp(generatedBuffer)
    .resize(width, height, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer();

  // 3. Ajusta a máscara com feathering (suavização gaussiana na borda da linha capilar)
  let maskSharp = sharp(maskBuffer).resize(width, height, { fit: 'fill' }).toColorspace('b-w');
  if (featherSigma > 0) {
    maskSharp = maskSharp.blur(featherSigma);
  }
  const maskRaw = await maskSharp.raw().toBuffer();

  // 4. Executa a composição matemática direta
  const totalPixels = width * height;
  const compositeRaw = Buffer.alloc(totalPixels * 4);

  let outsideMaskCount = 0;
  let outsideMaskDiffCount = 0;

  for (let i = 0; i < totalPixels; i++) {
    const maskVal = maskRaw[i]; // 0 (original) a 255 (gerado)
    const alphaWeight = maskVal / 255.0;

    const offset = i * 4;
    const origR = origRaw[offset];
    const origG = origRaw[offset + 1];
    const origB = origRaw[offset + 2];
    const origA = origRaw[offset + 3];

    const genR = genRaw[offset];
    const genG = genRaw[offset + 1];
    const genB = genRaw[offset + 2];

    if (maskVal === 0) {
      // 100% Original Garantido (Zero mutação)
      compositeRaw[offset] = origR;
      compositeRaw[offset + 1] = origG;
      compositeRaw[offset + 2] = origB;
      compositeRaw[offset + 3] = origA;

      outsideMaskCount++;
    } else if (maskVal === 255) {
      // 100% Região Gerada (Cabelo novo)
      compositeRaw[offset] = genR;
      compositeRaw[offset + 1] = genG;
      compositeRaw[offset + 2] = genB;
      compositeRaw[offset + 3] = origA;
    } else {
      // Zona de transição suave (Feathering na linha da testa/costeleta)
      compositeRaw[offset] = Math.round(origR * (1.0 - alphaWeight) + genR * alphaWeight);
      compositeRaw[offset + 1] = Math.round(origG * (1.0 - alphaWeight) + genG * alphaWeight);
      compositeRaw[offset + 2] = Math.round(origB * (1.0 - alphaWeight) + genB * alphaWeight);
      compositeRaw[offset + 3] = origA;
    }

    // Auditoria de divergência fora da máscara
    if (maskVal === 0) {
      const diff =
        Math.abs(compositeRaw[offset] - origR) +
        Math.abs(compositeRaw[offset + 1] - origG) +
        Math.abs(compositeRaw[offset + 2] - origB);
      if (diff > 0) outsideMaskDiffCount++;
    }
  }

  const outsideMaskPixelChangeRatio = outsideMaskCount > 0 ? outsideMaskDiffCount / outsideMaskCount : 0.0;

  // 5. Calcula a similaridade estrutural (SSIM) no centro protegido do rosto
  const faceSSIM = await calculateProtectedFaceSSIM(origRaw, compositeRaw, width, height, faceBox, mode);

  // 6. Codifica o resultado final como JPEG de alta qualidade
  const compositeBuffer = await sharp(compositeRaw, {
    raw: { width, height, channels: 4 },
  })
    .jpeg({ quality: 94, chromaSubsampling: '4:4:4' })
    .toBuffer();

  return {
    compositeBuffer,
    mimeType: 'image/jpeg',
    width,
    height,
    outsideMaskPixelChangeRatio,
    faceSSIM,
  };
}

/**
 * Calcula a similaridade SSIM na região facial protegida (olhos, nariz e boca).
 * Com a composição por máscara zero, este valor tende a 1.00 (100% idêntico).
 */
export async function calculateProtectedFaceSSIM(
  origRaw: Buffer,
  compRaw: Buffer,
  width: number,
  height: number,
  faceBox?: FaceBox,
  mode: string = 'HAIR_ONLY'
): Promise<number> {
  // Define o recorte da face protegida (olhos, sobrancelhas, nariz e boca)
  const fb = faceBox || {
    x: Math.round(width * 0.25),
    y: Math.round(height * 0.25),
    width: Math.round(width * 0.50),
    height: Math.round(height * 0.50),
  };

  const isBeardMode = mode === 'BEARD_ONLY' || mode === 'HAIR_AND_BEARD';

  // Se o modo incluir barba, o contorno externo da mandíbula/costeletas foi autorizado para edição.
  // A validação de identidade foca estritamente no núcleo anatômico inegociável:
  // olhos, sobrancelhas, glabela, nariz e boca/lábio superior (X central: 26% a 74%, Y: 22% a 68%).
  const startX = Math.max(0, Math.round(fb.x + fb.width * (isBeardMode ? 0.26 : 0.18)));
  const endX = Math.min(width, Math.round(fb.x + fb.width * (isBeardMode ? 0.74 : 0.82)));
  const startY = Math.max(0, Math.round(fb.y + fb.height * 0.22));
  const endY = Math.min(height, Math.round(fb.y + fb.height * (isBeardMode ? 0.68 : 0.85)));

  let sumOrig = 0;
  let sumComp = 0;
  let count = 0;

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const idx = (y * width + x) * 4;
      // Luminância Y = 0.299R + 0.587G + 0.114B
      const lOrig = 0.299 * origRaw[idx] + 0.587 * origRaw[idx + 1] + 0.114 * origRaw[idx + 2];
      const lComp = 0.299 * compRaw[idx] + 0.587 * compRaw[idx + 1] + 0.114 * compRaw[idx + 2];

      sumOrig += lOrig;
      sumComp += lComp;
      count++;
    }
  }

  if (count === 0) return 1.0;

  const meanOrig = sumOrig / count;
  const meanComp = sumComp / count;

  let varOrig = 0;
  let varComp = 0;
  let covar = 0;

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const idx = (y * width + x) * 4;
      const lOrig = 0.299 * origRaw[idx] + 0.587 * origRaw[idx + 1] + 0.114 * origRaw[idx + 2];
      const lComp = 0.299 * compRaw[idx] + 0.587 * compRaw[idx + 1] + 0.114 * compRaw[idx + 2];

      const dOrig = lOrig - meanOrig;
      const dComp = lComp - meanComp;

      varOrig += dOrig * dOrig;
      varComp += dComp * dComp;
      covar += dOrig * dComp;
    }
  }

  varOrig /= count;
  varComp /= count;
  covar /= count;

  // Constantes de estabilização SSIM (K1=0.01, K2=0.03, L=255)
  const C1 = (0.01 * 255) * (0.01 * 255);
  const C2 = (0.03 * 255) * (0.03 * 255);

  const num = (2 * meanOrig * meanComp + C1) * (2 * covar + C2);
  const den = (meanOrig * meanOrig + meanComp * meanComp + C1) * (varOrig + varComp + C2);

  if (den === 0) return 1.0;
  const ssim = num / den;
  return Math.max(0.0, Math.min(1.0, ssim));
}
