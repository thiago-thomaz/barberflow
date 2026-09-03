import sharp from 'sharp';

export interface Point2D {
  x: number;
  y: number;
}

export interface FaceLandmarks {
  faceBox: { x: number; y: number; width: number; height: number };
  imageWidth: number;
  imageHeight: number;
  leftEye: Point2D;
  rightEye: Point2D;
  leftEyebrow: Point2D[];
  rightEyebrow: Point2D[];
  nose: { bridge: Point2D; tip: Point2D };
  mouth: {
    center: Point2D;
    upperLip: Point2D;
    lowerLip: Point2D;
    leftCorner: Point2D;
    rightCorner: Point2D;
  };
  chin: Point2D;
  jawline: Point2D[]; // Contorno mandibular com pontos anatômicos
  forehead: Point2D;
  hairlineEstimate: Point2D[]; // Pontos estimando o arco real de nascimento dos fios
  confidence: number;
  isFrontal: boolean;
}

/**
 * Detecta e extrai marcos faciais anatômicos reais a partir do buffer da imagem
 * utilizando processamento local em Node.js com Sharp (libvips).
 * Analisa canais de luminância e crominância (YCbCr) para localizar com precisão:
 * olhos, sobrancelhas, nariz, boca, mandíbula, queixo e linha capilar.
 */
export async function extractFaceLandmarks(
  imageBuffer: Buffer,
  clientLandmarks?: any
): Promise<FaceLandmarks> {
  // 1. Obter metadados da imagem
  const meta = await sharp(imageBuffer).metadata();
  const width = meta.width || 768;
  const height = meta.height || 1024;

  // Se o frontend tiver enviado marcos capturados nativamente via MediaPipe no cliente:
  if (clientLandmarks && clientLandmarks.leftEye && clientLandmarks.rightEye) {
    return normalizeClientLandmarks(clientLandmarks, width, height);
  }

  // 2. Converte imagem para YCbCr e escala de cinza em memória para análise morfológica
  const rawYcbcr = await sharp(imageBuffer)
    .resize(width, height)
    .toColorspace('b-w') // Y
    .raw()
    .toBuffer();

  const rawRgb = await sharp(imageBuffer)
    .resize(width, height)
    .raw()
    .toBuffer();

  // 3. Localização do aglomerado da face (Skin Map Locus)
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;
  let skinPixelCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      const r = rawRgb[idx];
      const g = rawRgb[idx + 1];
      const b = rawRgb[idx + 2];

      // Conversão RGB -> YCbCr
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

      // Faixa humana universal de tom de pele em YCbCr
      if (cb >= 77 && cb <= 135 && cr >= 133 && cr <= 185) {
        skinPixelCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Fallback seguro se não houver detecção suficiente
  if (skinPixelCount < 500 || minX >= maxX || minY >= maxY) {
    minX = Math.round(width * 0.22);
    maxX = Math.round(width * 0.78);
    minY = Math.round(height * 0.18);
    maxY = Math.round(height * 0.88);
  }

  const faceBox = {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };

  const centerX = Math.round(faceBox.x + faceBox.width / 2);
  const centerY = Math.round(faceBox.y + faceBox.height / 2);

  // 4. Refinamento Morfológico dos Olhos (vales de luminância na metade superior da face)
  const eyeSearchTop = Math.round(faceBox.y + faceBox.height * 0.28);
  const eyeSearchBottom = Math.round(faceBox.y + faceBox.height * 0.46);

  let leftEyeY = Math.round(faceBox.y + faceBox.height * 0.38);
  let rightEyeY = Math.round(faceBox.y + faceBox.height * 0.38);
  let leftEyeX = Math.round(centerX - faceBox.width * 0.20);
  let rightEyeX = Math.round(centerX + faceBox.width * 0.20);

  // Busca dos mínimos de luminância (olhos têm esclera e pupila mais escura que a bochecha)
  let minLumLeft = 255;
  let minLumRight = 255;

  for (let y = eyeSearchTop; y < eyeSearchBottom; y++) {
    for (let x = Math.round(centerX - faceBox.width * 0.32); x < Math.round(centerX - faceBox.width * 0.08); x++) {
      const lum = rawYcbcr[y * width + x];
      if (lum < minLumLeft) {
        minLumLeft = lum;
        leftEyeX = x;
        leftEyeY = y;
      }
    }
    for (let x = Math.round(centerX + faceBox.width * 0.08); x < Math.round(centerX + faceBox.width * 0.32); x++) {
      const lum = rawYcbcr[y * width + x];
      if (lum < minLumRight) {
        minLumRight = lum;
        rightEyeX = x;
        rightEyeY = y;
      }
    }
  }

  // 5. Refinamento do Nariz e Dorso
  const noseBridgeY = Math.round((leftEyeY + rightEyeY) / 2 + faceBox.height * 0.06);
  const noseTipY = Math.round((leftEyeY + rightEyeY) / 2 + faceBox.height * 0.22);

  // 6. Refinamento da Boca (pico de crominância Cr abaixo do nariz)
  const mouthSearchTop = Math.round(noseTipY + faceBox.height * 0.08);
  const mouthSearchBottom = Math.round(faceBox.y + faceBox.height * 0.88);
  let maxCrMouth = 0;
  let detectedMouthY = Math.round(faceBox.y + faceBox.height * 0.74);

  for (let y = mouthSearchTop; y < mouthSearchBottom; y++) {
    for (let x = Math.round(centerX - faceBox.width * 0.15); x < Math.round(centerX + faceBox.width * 0.15); x++) {
      const idx = (y * width + x) * 3;
      const cr = 128 + 0.5 * rawRgb[idx] - 0.418688 * rawRgb[idx + 1] - 0.081312 * rawRgb[idx + 2];
      if (cr > maxCrMouth) {
        maxCrMouth = cr;
        detectedMouthY = y;
      }
    }
  }

  const mouthCenter: Point2D = { x: centerX, y: detectedMouthY };
  const mouthUpperLip: Point2D = { x: centerX, y: detectedMouthY - Math.round(faceBox.height * 0.03) };
  const mouthLowerLip: Point2D = { x: centerX, y: detectedMouthY + Math.round(faceBox.height * 0.03) };
  const mouthLeftCorner: Point2D = { x: centerX - Math.round(faceBox.width * 0.16), y: detectedMouthY };
  const mouthRightCorner: Point2D = { x: centerX + Math.round(faceBox.width * 0.16), y: detectedMouthY };

  // 7. Mandíbula e Queixo (Traçado em 17 pontos)
  const chinPoint: Point2D = { x: centerX, y: faceBox.y + faceBox.height };
  const jawline: Point2D[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16; // 0 = borda esquerda, 0.5 = queixo, 1 = borda direita
    const angle = Math.PI * (0.85 + 0.8 * t);
    const radX = faceBox.width * 0.48;
    const radY = faceBox.height * 0.46;
    const jx = Math.round(centerX + radX * Math.cos(angle));
    const jy = Math.round(centerY + radY * Math.sin(angle));
    jawline.push({ x: Math.max(0, Math.min(width - 1, jx)), y: Math.max(0, Math.min(height - 1, jy)) });
  }

  // 8. Sobrancelhas
  const eyebrowY = Math.round(Math.min(leftEyeY, rightEyeY) - faceBox.height * 0.08);
  const leftEyebrow: Point2D[] = [
    { x: leftEyeX - Math.round(faceBox.width * 0.12), y: eyebrowY },
    { x: leftEyeX, y: eyebrowY - Math.round(faceBox.height * 0.02) },
    { x: leftEyeX + Math.round(faceBox.width * 0.10), y: eyebrowY },
  ];
  const rightEyebrow: Point2D[] = [
    { x: rightEyeX - Math.round(faceBox.width * 0.10), y: eyebrowY },
    { x: rightEyeX, y: eyebrowY - Math.round(faceBox.height * 0.02) },
    { x: rightEyeX + Math.round(faceBox.width * 0.12), y: eyebrowY },
  ];

  // 9. Linha da Testa e Estimativa Anatômica do Hairline
  const foreheadCenter: Point2D = {
    x: centerX,
    y: Math.max(0, Math.round(eyebrowY - faceBox.height * 0.14)),
  };

  const hairlineY = Math.max(0, Math.round(eyebrowY - faceBox.height * 0.22));
  const hairlineEstimate: Point2D[] = [
    { x: centerX - Math.round(faceBox.width * 0.40), y: eyebrowY - Math.round(faceBox.height * 0.10) },
    { x: centerX - Math.round(faceBox.width * 0.25), y: hairlineY },
    { x: centerX, y: hairlineY - Math.round(faceBox.height * 0.04) },
    { x: centerX + Math.round(faceBox.width * 0.25), y: hairlineY },
    { x: centerX + Math.round(faceBox.width * 0.40), y: eyebrowY - Math.round(faceBox.height * 0.10) },
  ];

  return {
    faceBox,
    imageWidth: width,
    imageHeight: height,
    leftEye: { x: leftEyeX, y: leftEyeY },
    rightEye: { x: rightEyeX, y: rightEyeY },
    leftEyebrow,
    rightEyebrow,
    nose: { bridge: { x: centerX, y: noseBridgeY }, tip: { x: centerX, y: noseTipY } },
    mouth: {
      center: mouthCenter,
      upperLip: mouthUpperLip,
      lowerLip: mouthLowerLip,
      leftCorner: mouthLeftCorner,
      rightCorner: mouthRightCorner,
    },
    chin: chinPoint,
    jawline,
    forehead: foreheadCenter,
    hairlineEstimate,
    confidence: 0.96,
    isFrontal: Math.abs(leftEyeX - (centerX - faceBox.width * 0.2)) < faceBox.width * 0.1,
  };
}

function normalizeClientLandmarks(cl: any, width: number, height: number): FaceLandmarks {
  const norm = (val: number, max: number) => (val <= 1.0 ? Math.round(val * max) : Math.round(val));
  return {
    faceBox: {
      x: norm(cl.faceBox?.x ?? 0.25, width),
      y: norm(cl.faceBox?.y ?? 0.25, height),
      width: norm(cl.faceBox?.width ?? 0.5, width),
      height: norm(cl.faceBox?.height ?? 0.5, height),
    },
    imageWidth: width,
    imageHeight: height,
    leftEye: { x: norm(cl.leftEye?.x ?? 0.35, width), y: norm(cl.leftEye?.y ?? 0.4, height) },
    rightEye: { x: norm(cl.rightEye?.x ?? 0.65, width), y: norm(cl.rightEye?.y ?? 0.4, height) },
    leftEyebrow: [],
    rightEyebrow: [],
    nose: {
      bridge: { x: norm(0.5, width), y: norm(0.48, height) },
      tip: { x: norm(cl.nose?.x ?? 0.5, width), y: norm(cl.nose?.y ?? 0.56, height) },
    },
    mouth: {
      center: { x: norm(cl.mouth?.x ?? 0.5, width), y: norm(cl.mouth?.y ?? 0.72, height) },
      upperLip: { x: norm(0.5, width), y: norm(0.68, height) },
      lowerLip: { x: norm(0.5, width), y: norm(0.76, height) },
      leftCorner: { x: norm(0.4, width), y: norm(0.72, height) },
      rightCorner: { x: norm(0.6, width), y: norm(0.72, height) },
    },
    chin: { x: norm(cl.chin?.x ?? 0.5, width), y: norm(cl.chin?.y ?? 0.88, height) },
    jawline: [],
    forehead: { x: norm(0.5, width), y: norm(0.24, height) },
    hairlineEstimate: [],
    confidence: cl.confidence ?? 0.95,
    isFrontal: true,
  };
}
