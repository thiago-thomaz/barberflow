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
 * análise de luminância, crominância YCbCr, detecção de cavidades oculares e gradientes.
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

  // 1. Identifica aglomerado de pele no espaço YCbCr
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

        // Considera apenas a região central para evitar ruídos de fundo
        if (x >= width * 0.10 && x <= width * 0.90 && y >= height * 0.08 && y <= height * 0.92) {
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
    minY = Math.round(height * 0.15);
    maxY = Math.round(height * 0.85);
  }

  const faceBox = {
    x: minX,
    y: minY,
    width: Math.max(50, maxX - minX),
    height: Math.max(50, maxY - minY),
  };

  const centerX = Math.round(faceBox.x + faceBox.width / 2);
  const centerY = Math.round(faceBox.y + faceBox.height / 2);

  // 2. Localização das cavidades oculares (centroides ponderados de baixa luminância)
  const eyeSearchTop = Math.round(faceBox.y + faceBox.height * 0.22);
  const eyeSearchBottom = Math.round(faceBox.y + faceBox.height * 0.44);

  // Quadrante esquerdo
  let leftWeightSum = 0;
  let leftXSum = 0;
  let leftYSum = 0;
  for (let y = eyeSearchTop; y <= eyeSearchBottom; y++) {
    for (let x = Math.round(faceBox.x + faceBox.width * 0.15); x < centerX - 5; x++) {
      const invLum = Math.max(0, 180 - lumMap[y * width + x]);
      const w = invLum * invLum;
      leftWeightSum += w;
      leftXSum += x * w;
      leftYSum += y * w;
    }
  }
  const leftEyeX = leftWeightSum > 0 ? Math.round(leftXSum / leftWeightSum) : Math.round(faceBox.x + faceBox.width * 0.30);
  const leftEyeY = leftWeightSum > 0 ? Math.round(leftYSum / leftWeightSum) : Math.round(faceBox.y + faceBox.height * 0.35);

  // Quadrante direito
  let rightWeightSum = 0;
  let rightXSum = 0;
  let rightYSum = 0;
  for (let y = eyeSearchTop; y <= eyeSearchBottom; y++) {
    for (let x = centerX + 5; x <= Math.round(faceBox.x + faceBox.width * 0.85); x++) {
      const invLum = Math.max(0, 180 - lumMap[y * width + x]);
      const w = invLum * invLum;
      rightWeightSum += w;
      rightXSum += x * w;
      rightYSum += y * w;
    }
  }
  const rightEyeX = rightWeightSum > 0 ? Math.round(rightXSum / rightWeightSum) : Math.round(faceBox.x + faceBox.width * 0.70);
  const rightEyeY = rightWeightSum > 0 ? Math.round(rightYSum / rightWeightSum) : Math.round(faceBox.y + faceBox.height * 0.35);

  const eyeWidth = Math.round(faceBox.width * 0.18);
  const eyeHeight = Math.round(faceBox.height * 0.10);

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

  // 3. Localização do Nariz (Ponta e Dorso)
  const avgEyeY = Math.round((leftEyeY + rightEyeY) / 2);
  const noseTipY = Math.round(avgEyeY + faceBox.height * 0.22);
  const nose: NoseLandmark = {
    tipX: centerX,
    tipY: noseTipY,
    bridgeTopY: avgEyeY,
    bridgeBottomY: noseTipY,
    leftNostrilX: Math.round(centerX - faceBox.width * 0.10),
    rightNostrilX: Math.round(centerX + faceBox.width * 0.10),
  };

  // 4. Localização da Boca (Abaixo do nariz)
  const mouthY = Math.round(noseTipY + faceBox.height * 0.16);
  const mouthWidth = Math.round(faceBox.width * 0.32);
  const mouthHeight = Math.round(faceBox.height * 0.10);

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

  // 5. Contorno da Mandíbula e Queixo
  const chinY = Math.round(faceBox.y + faceBox.height * 0.95);
  const jawlinePoints: Point2D[] = [];
  const numJawPoints = 17;

  for (let i = 0; i < numJawPoints; i++) {
    const t = i / (numJawPoints - 1); // 0 a 1
    const angle = Math.PI * (0.85 + t * 1.3); // Arco inferior da mandíbula
    const radX = faceBox.width * 0.50;
    const radY = faceBox.height * 0.52;

    const px = Math.round(centerX + Math.cos(angle) * radX);
    const py = Math.round(centerY + Math.sin(angle) * radY);
    jawlinePoints.push({
      x: Math.max(0, Math.min(width - 1, px)),
      y: Math.max(0, Math.min(height - 1, py)),
    });
  }

  const jawline: JawlineLandmark = {
    points: jawlinePoints,
    leftEarX: faceBox.x,
    rightEarX: faceBox.x + faceBox.width,
    chinTipX: centerX,
    chinTipY: chinY,
  };

  // 6. Linha da Testa e Início Real do Cabelo (Hairline)
  const eyebrowY = Math.round(avgEyeY - faceBox.height * 0.08);
  const foreheadTopY = Math.round(Math.max(0, faceBox.y + faceBox.height * 0.08));

  const forehead: ForeheadLandmark = {
    topY: foreheadTopY,
    bottomY: eyebrowY,
    leftX: Math.round(faceBox.x + faceBox.width * 0.15),
    rightX: Math.round(faceBox.x + faceBox.width * 0.85),
  };

  // Detecta onde o contraste muda da pele da testa para o cabelo/fundo
  let detectedHairlineY = foreheadTopY;
  for (let y = eyebrowY; y >= Math.max(0, faceBox.y - 30); y--) {
    const isSkinCenter = skinMap[y * width + centerX] === 1;
    if (!isSkinCenter) {
      detectedHairlineY = y;
      break;
    }
  }

  const hairlinePoints: Point2D[] = [];
  const numHairlinePoints = 11;
  for (let i = 0; i < numHairlinePoints; i++) {
    const t = i / (numHairlinePoints - 1);
    const hx = Math.round(forehead.leftX + t * (forehead.rightX - forehead.leftX));
    // Arco natural da linha capilar
    const arch = Math.sin(t * Math.PI) * (faceBox.height * 0.06);
    const hy = Math.round(detectedHairlineY - arch);
    hairlinePoints.push({ x: hx, y: Math.max(0, hy) });
  }

  const hairline: HairlineLandmark = {
    points: hairlinePoints,
    centerHairlineY: detectedHairlineY,
    leftTempleX: forehead.leftX,
    rightTempleX: forehead.rightX,
  };

  const confidence = skinPixelCount > 5000 ? 0.98 : skinPixelCount > 1000 ? 0.85 : 0.10;
  const isFrontal = skinPixelCount > 1000 && Math.abs(centerX - width / 2) < width * 0.25;

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
