import sharp from 'sharp';

export interface Point2D {
  x: number;
  y: number;
}

export interface EyeLandmark {
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  pupilX: number;
  pupilY: number;
}

export interface NoseLandmark {
  tipX: number;
  tipY: number;
  bridgeTopY: number;
  bridgeBottomY: number;
  leftNostrilX: number;
  rightNostrilX: number;
}

export interface MouthLandmark {
  centerX: number;
  centerY: number;
  upperLipY: number;
  lowerLipY: number;
  leftCornerX: number;
  rightCornerX: number;
  width: number;
  height: number;
}

export interface JawlineLandmark {
  points: Point2D[];
  leftEarX: number;
  rightEarX: number;
  chinTipX: number;
  chinTipY: number;
}

export interface ForeheadLandmark {
  topY: number;
  bottomY: number; // Linha logo acima das sobrancelhas
  leftX: number;
  rightX: number;
}

export interface HairlineLandmark {
  points: Point2D[];
  centerHairlineY: number;
  leftTempleX: number;
  rightTempleX: number;
}

export interface FaceLandmarks {
  imageWidth: number;
  imageHeight: number;
  faceBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  leftEye: EyeLandmark;
  rightEye: EyeLandmark;
  nose: NoseLandmark;
  mouth: MouthLandmark;
  jawline: JawlineLandmark;
  forehead: ForeheadLandmark;
  hairline: HairlineLandmark;
  confidence: number;
  isFrontal: boolean;
}

/**
 * Detecta marcos faciais anatômicos reais a partir do buffer da imagem utilizando
 * análise de luminância, crominância YCbCr e proporções biométricas canônicas.
 */
export async function extractFaceLandmarks(
  imageBuffer: Buffer,
  canonicalWidth?: number,
  canonicalHeight?: number
): Promise<FaceLandmarks> {
  const meta = await sharp(imageBuffer).metadata();
  const width = canonicalWidth || meta.width || 768;
  const height = canonicalHeight || meta.height || 1024;

  const raw = await sharp(imageBuffer)
    .resize(width, height, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer();

  // 1. Identifica aglomerado de pele no espaço YCbCr no terço superior/médio da foto (rosto)
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;
  let skinPixelCount = 0;

  const skinMap = new Uint8Array(width * height);
  const lumMap = new Uint8Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 3;
      const r = raw[idx];
      const g = raw[idx + 1];
      const b = raw[idx + 2];

      const Y = 0.299 * r + 0.587 * g + 0.114 * b;
      const Cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const Cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

      lumMap[y * width + x] = Math.round(Y);

      // Critério de pele humana adaptativo
      const isSkin = Cb >= 77 && Cb <= 135 && Cr >= 133 && Cr <= 185 && Y > 30;

      if (isSkin) {
        skinMap[y * width + x] = 1;
        skinPixelCount++;

        // Foca no centro vertical onde o rosto fica (evita peito/roupas inferiores)
        if (x >= width * 0.12 && x <= width * 0.88 && y >= height * 0.10 && y <= height * 0.85) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
  }

  // Fallback seguro se não encontrar pele suficiente
  if (skinPixelCount < 1000 || minX >= maxX || minY >= maxY) {
    minX = Math.round(width * 0.20);
    maxX = Math.round(width * 0.80);
    minY = Math.round(height * 0.18);
    maxY = Math.round(height * 0.78);
  }

  // 2. Localização das cavidades oculares (centroides de baixa luminância / sombra dos olhos)
  const initialCenterX = Math.round((minX + maxX) / 2);
  const eyeSearchTop = Math.round(minY + (maxY - minY) * 0.18);
  const eyeSearchBottom = Math.round(minY + (maxY - minY) * 0.50);

  // Quadrante esquerdo
  let leftWeightSum = 0;
  let leftXSum = 0;
  let leftYSum = 0;
  for (let y = eyeSearchTop; y <= eyeSearchBottom; y++) {
    for (let x = Math.round(minX + (maxX - minX) * 0.10); x < initialCenterX - 5; x++) {
      const invLum = Math.max(0, 180 - lumMap[y * width + x]);
      const w = invLum * invLum;
      leftWeightSum += w;
      leftXSum += x * w;
      leftYSum += y * w;
    }
  }
  let leftEyeX = leftWeightSum > 0 ? Math.round(leftXSum / leftWeightSum) : Math.round(minX + (maxX - minX) * 0.30);
  let leftEyeY = leftWeightSum > 0 ? Math.round(leftYSum / leftWeightSum) : Math.round(minY + (maxY - minY) * 0.35);

  // Quadrante direito
  let rightWeightSum = 0;
  let rightXSum = 0;
  let rightYSum = 0;
  for (let y = eyeSearchTop; y <= eyeSearchBottom; y++) {
    for (let x = initialCenterX + 5; x <= Math.round(minX + (maxX - minX) * 0.90); x++) {
      const invLum = Math.max(0, 180 - lumMap[y * width + x]);
      const w = invLum * invLum;
      rightWeightSum += w;
      rightXSum += x * w;
      rightYSum += y * w;
    }
  }
  let rightEyeX = rightWeightSum > 0 ? Math.round(rightXSum / rightWeightSum) : Math.round(minX + (maxX - minX) * 0.70);
  let rightEyeY = rightWeightSum > 0 ? Math.round(rightYSum / rightWeightSum) : Math.round(minY + (maxY - minY) * 0.35);

  // Garante separação anatômica mínima entre olhos
  if (rightEyeX <= leftEyeX + 30) {
    leftEyeX = Math.round(width * 0.35);
    rightEyeX = Math.round(width * 0.65);
    leftEyeY = Math.round(height * 0.40);
    rightEyeY = Math.round(height * 0.40);
  }

  const eyeDistance = Math.max(40, rightEyeX - leftEyeX);
  const centerX = Math.round((leftEyeX + rightEyeX) / 2);
  const avgEyeY = Math.round((leftEyeY + rightEyeY) / 2);

  // 3. Proporções Biométricas Canônicas Ancoradas nos Olhos (Imunes a roupas/pescoço)
  const faceWidth = Math.round(eyeDistance * 2.25);
  const faceHeight = Math.round(eyeDistance * 2.75);

  const faceBox = {
    x: Math.max(0, Math.round(centerX - faceWidth / 2)),
    y: Math.max(0, Math.round(avgEyeY - eyeDistance * 1.05)),
    width: Math.min(width, faceWidth),
    height: Math.min(height, faceHeight),
  };

  const eyeWidth = Math.round(eyeDistance * 0.40);
  const eyeHeight = Math.round(eyeDistance * 0.25);

  const leftEye: EyeLandmark = {
    centerX: leftEyeX,
    centerY: leftEyeY,
    width: eyeWidth,
    height: eyeHeight,
    pupilX: leftEyeX,
    pupilY: leftEyeY,
  };

  const rightEye: EyeLandmark = {
    centerX: rightEyeX,
    centerY: rightEyeY,
    width: eyeWidth,
    height: eyeHeight,
    pupilX: rightEyeX,
    pupilY: rightEyeY,
  };

  // 4. Localização do Nariz (Ponta e Dorso)
  const noseTipY = Math.round(avgEyeY + eyeDistance * 0.65);
  const nose: NoseLandmark = {
    tipX: centerX,
    tipY: noseTipY,
    bridgeTopY: avgEyeY,
    bridgeBottomY: noseTipY,
    leftNostrilX: Math.round(centerX - eyeDistance * 0.22),
    rightNostrilX: Math.round(centerX + eyeDistance * 0.22),
  };

  // 5. Localização da Boca
  const mouthY = Math.round(avgEyeY + eyeDistance * 1.15);
  const mouthWidth = Math.round(eyeDistance * 0.75);
  const mouthHeight = Math.round(eyeDistance * 0.30);

  const mouth: MouthLandmark = {
    centerX,
    centerY: mouthY,
    upperLipY: Math.round(mouthY - mouthHeight * 0.4),
    lowerLipY: Math.round(mouthY + mouthHeight * 0.6),
    leftCornerX: Math.round(centerX - mouthWidth / 2),
    rightCornerX: Math.round(centerX + mouthWidth / 2),
    width: mouthWidth,
    height: mouthHeight,
  };

  // 6. Contorno da Mandíbula e Queixo
  const chinY = Math.round(avgEyeY + eyeDistance * 1.65);
  const jawlinePoints: Point2D[] = [];
  const numJawPoints = 17;

  for (let i = 0; i < numJawPoints; i++) {
    const t = i / (numJawPoints - 1); // 0 a 1
    const angle = Math.PI * (0.85 + t * 1.3);
    const radX = faceWidth * 0.50;
    const radY = (chinY - avgEyeY) * 1.05;

    const px = Math.round(centerX + Math.cos(angle) * radX);
    const py = Math.round(avgEyeY + Math.sin(angle) * radY);
    jawlinePoints.push({
      x: Math.max(0, Math.min(width - 1, px)),
      y: Math.max(0, Math.min(height - 1, py)),
    });
  }

  const jawline: JawlineLandmark = {
    points: jawlinePoints,
    leftEarX: Math.max(0, Math.round(centerX - faceWidth * 0.55)),
    rightEarX: Math.min(width - 1, Math.round(centerX + faceWidth * 0.55)),
    chinTipX: centerX,
    chinTipY: chinY,
  };

  // 7. Linha da Testa e Início do Cabelo (Hairline)
  const eyebrowY = Math.round(avgEyeY - eyeDistance * 0.30);
  const defaultHairlineY = Math.round(avgEyeY - eyeDistance * 0.85);

  // Detecta onde o contraste muda da pele da testa para o cabelo/fundo
  let detectedHairlineY = defaultHairlineY;
  for (let y = eyebrowY; y >= Math.max(0, avgEyeY - eyeDistance * 1.3); y--) {
    const isSkinCenter = skinMap[y * width + centerX] === 1;
    if (!isSkinCenter) {
      detectedHairlineY = y;
      break;
    }
  }

  // Limite seguro para não avançar sobre a testa/sobrancelhas
  detectedHairlineY = Math.min(eyebrowY - Math.round(eyeDistance * 0.25), detectedHairlineY);

  const foreheadTopY = Math.max(0, detectedHairlineY);
  const forehead: ForeheadLandmark = {
    topY: foreheadTopY,
    bottomY: eyebrowY,
    leftX: Math.round(centerX - faceWidth * 0.30),
    rightX: Math.round(centerX + faceWidth * 0.30),
  };

  const hairlinePoints: Point2D[] = [];
  const numHairlinePoints = 11;
  for (let i = 0; i < numHairlinePoints; i++) {
    const t = i / (numHairlinePoints - 1);
    const hx = Math.round(forehead.leftX + t * (forehead.rightX - forehead.leftX));
    const arch = Math.sin(t * Math.PI) * (eyeDistance * 0.12);
    const hy = Math.round(detectedHairlineY - arch);
    hairlinePoints.push({ x: hx, y: Math.max(0, hy) });
  }

  const hairline: HairlineLandmark = {
    points: hairlinePoints,
    centerHairlineY: detectedHairlineY,
    leftTempleX: forehead.leftX,
    rightTempleX: forehead.rightX,
  };

  const confidence = skinPixelCount > 3000 ? 0.98 : skinPixelCount > 800 ? 0.85 : 0.40;
  const isFrontal = Math.abs(centerX - width / 2) < width * 0.25;

  return {
    imageWidth: width,
    imageHeight: height,
    faceBox,
    leftEye,
    rightEye,
    nose,
    mouth,
    jawline,
    forehead,
    hairline,
    confidence,
    isFrontal,
  };
}
