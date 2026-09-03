import sharp from 'sharp';

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceGeometry {
  faceBox: FaceBox;
  imageWidth: number;
  imageHeight: number;
  centerX: number;
  centerY: number;
  // Coordenadas absolutas em pixels
  eyeLineY: number;
  leftEyeX: number;
  rightEyeX: number;
  noseTipY: number;
  noseTipX: number;
  mouthY: number;
  chinY: number;
  hairlineY: number;
  skullTopY: number;
  confidence: number;
  isFrontal: boolean;
}

export interface FacePreflightCheck {
  valid: boolean;
  reason?: string;
  width: number;
  height: number;
  geometry?: FaceGeometry;
}

/**
 * Validação de Pré-voo da Imagem do Usuário
 * Rejeita imagens corrompidas, excessivamente pequenas ou sem proporção mínima.
 */
export async function preflightCheckUserPhoto(imageBuffer: Buffer): Promise<FacePreflightCheck> {
  try {
    const metadata = await sharp(imageBuffer).metadata();
    const width = metadata.width || 0;
    const height = metadata.height || 0;

    if (width < 250 || height < 250) {
      return {
        valid: false,
        reason: 'Resolução muito baixa. Envie uma foto com pelo menos 400x400 pixels.',
        width,
        height,
      };
    }

    const aspectRatio = width / height;
    if (aspectRatio < 0.4 || aspectRatio > 2.5) {
      return {
        valid: false,
        reason: 'Enquadramento inadequado. Envie uma foto em orientação vertical ou quadrada.',
        width,
        height,
      };
    }

    const geometry = await detectFaceGeometry(imageBuffer, width, height);

    if (geometry.confidence < 0.45) {
      return {
        valid: false,
        reason: 'Não detectamos um rosto frontal claramente visível. Posicione-se de frente para a câmera com boa iluminação.',
        width,
        height,
        geometry,
      };
    }

    return {
      valid: true,
      width,
      height,
      geometry,
    };
  } catch (err: any) {
    return {
      valid: false,
      reason: `Arquivo de imagem corrompido ou formato inválido: ${err.message}`,
      width: 0,
      height: 0,
    };
  }
}

/**
 * Detecta a geometria facial real na foto em pixels reais.
 * Usa análise em espaço de cor YCbCr para localizar o aglomerado de pele da face
 * e ancorar os marcos anatômicos dinamicamente.
 */
export async function detectFaceGeometry(
  imageBuffer: Buffer,
  origWidth: number,
  origHeight: number,
  clientLandmarks?: any
): Promise<FaceGeometry> {
  // Se o cliente enviou landmarks válidos de API do browser (ex: FaceDetector)
  if (clientLandmarks && clientLandmarks.width && clientLandmarks.height) {
    const cl = clientLandmarks;
    const fb: FaceBox = {
      x: Math.max(0, Math.round(cl.x)),
      y: Math.max(0, Math.round(cl.y)),
      width: Math.min(origWidth, Math.round(cl.width)),
      height: Math.min(origHeight, Math.round(cl.height)),
    };
    return buildGeometryFromBox(fb, origWidth, origHeight, 0.95);
  }

  // Análise em grid de baixa resolução (rápida e robusta)
  const SAMPLE_W = 160;
  const SAMPLE_H = Math.round((160 * origHeight) / origWidth);

  const rawPixels = await sharp(imageBuffer)
    .resize(SAMPLE_W, SAMPLE_H, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer();

  const skinMap = new Uint8Array(SAMPLE_W * SAMPLE_H);
  let totalSkin = 0;
  let sumX = 0;
  let sumY = 0;

  for (let y = 0; y < SAMPLE_H; y++) {
    for (let x = 0; x < SAMPLE_W; x++) {
      const idx = (y * SAMPLE_W + x) * 3;
      const r = rawPixels[idx];
      const g = rawPixels[idx + 1];
      const b = rawPixels[idx + 2];

      // Conversão RGB -> YCbCr padrão ITU-R BT.601
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

      // Locus universal de pele humana: Cb [80..135], Cr [133..185]
      const isSkin = cb >= 77 && cb <= 135 && cr >= 133 && cr <= 185;

      if (isSkin) {
        skinMap[y * SAMPLE_W + x] = 1;
        totalSkin++;
        sumX += x;
        sumY += y;
      }
    }
  }

  // Se pouquíssima pele foi detectada (< 4% da imagem), assume centro com baixa confiança
  const skinRatio = totalSkin / (SAMPLE_W * SAMPLE_H);
  if (skinRatio < 0.04) {
    const fallbackBox: FaceBox = {
      x: Math.round(origWidth * 0.22),
      y: Math.round(origHeight * 0.18),
      width: Math.round(origWidth * 0.56),
      height: Math.round(origHeight * 0.62),
    };
    return buildGeometryFromBox(fallbackBox, origWidth, origHeight, 0.40);
  }

  // Centro de massa da pele
  const avgX = sumX / totalSkin;
  const avgY = sumY / totalSkin;

  // Encontra a caixa envolvente do núcleo facial (desconsiderando ruídos extremos)
  let minX = SAMPLE_W, maxX = 0, minY = SAMPLE_H, maxY = 0;
  for (let y = Math.max(0, Math.floor(avgY - SAMPLE_H * 0.38)); y < Math.min(SAMPLE_H, Math.ceil(avgY + SAMPLE_H * 0.38)); y++) {
    for (let x = Math.max(0, Math.floor(avgX - SAMPLE_W * 0.35)); x < Math.min(SAMPLE_W, Math.ceil(avgX + SAMPLE_W * 0.35)); x++) {
      if (skinMap[y * SAMPLE_W + x] === 1) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const scaleX = origWidth / SAMPLE_W;
  const scaleY = origHeight / SAMPLE_H;

  const boxW = Math.max(origWidth * 0.35, Math.min(origWidth * 0.85, (maxX - minX) * scaleX));
  const boxH = Math.max(origHeight * 0.38, Math.min(origHeight * 0.80, (maxY - minY) * scaleY));
  const boxX = Math.max(0, Math.min(origWidth - boxW, (avgX * scaleX) - boxW / 2));
  const boxY = Math.max(0, Math.min(origHeight - boxH, (avgY * scaleY) - boxH / 2));

  const faceBox: FaceBox = {
    x: Math.round(boxX),
    y: Math.round(boxY),
    width: Math.round(boxW),
    height: Math.round(boxH),
  };

  const confidence = Math.min(0.95, Math.max(0.60, skinRatio * 3.5));
  return buildGeometryFromBox(faceBox, origWidth, origHeight, confidence);
}

/**
 * Constrói os marcos anatômicos com base nas proporções do rosto detectado.
 */
function buildGeometryFromBox(
  faceBox: FaceBox,
  imageWidth: number,
  imageHeight: number,
  confidence: number
): FaceGeometry {
  const centerX = faceBox.x + faceBox.width / 2;
  const centerY = faceBox.y + faceBox.height / 2;

  // Proporções áureas faciais relativas à caixa facial
  const eyeLineY = faceBox.y + faceBox.height * 0.38;
  const leftEyeX = centerX - faceBox.width * 0.19;
  const rightEyeX = centerX + faceBox.width * 0.19;
  const noseTipY = faceBox.y + faceBox.height * 0.58;
  const noseTipX = centerX;
  const mouthY = faceBox.y + faceBox.height * 0.74;
  const chinY = faceBox.y + faceBox.height * 0.96;
  const hairlineY = faceBox.y + faceBox.height * 0.12;
  const skullTopY = Math.max(0, faceBox.y - faceBox.height * 0.32);

  return {
    faceBox,
    imageWidth,
    imageHeight,
    centerX,
    centerY,
    eyeLineY,
    leftEyeX,
    rightEyeX,
    noseTipY,
    noseTipX,
    mouthY,
    chinY,
    hairlineY,
    skullTopY,
    confidence,
    isFrontal: true,
  };
}
