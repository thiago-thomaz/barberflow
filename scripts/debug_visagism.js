const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function extractFaceLandmarks(imageBuffer, canonicalWidth, canonicalHeight) {
  const meta = await sharp(imageBuffer).metadata();
  const width = canonicalWidth || meta.width || 768;
  const height = canonicalHeight || meta.height || 1024;

  const raw = await sharp(imageBuffer)
    .resize(width, height, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer();

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
      const isSkin = Cb >= 77 && Cb <= 135 && Cr >= 133 && Cr <= 185 && Y > 30;

      if (isSkin) {
        skinMap[y * width + x] = 1;
        skinPixelCount++;

        if (x >= width * 0.10 && x <= width * 0.90 && y >= height * 0.08 && y <= height * 0.92) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
  }

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

  const eyeSearchTop = Math.round(faceBox.y + faceBox.height * 0.22);
  const eyeSearchBottom = Math.round(faceBox.y + faceBox.height * 0.44);

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

  const avgEyeY = Math.round((leftEyeY + rightEyeY) / 2);
  const eyebrowY = Math.round(avgEyeY - faceBox.height * 0.08);
  const foreheadTopY = Math.round(Math.max(0, faceBox.y + faceBox.height * 0.08));

  let detectedHairlineY = foreheadTopY;
  for (let y = eyebrowY; y >= Math.max(0, faceBox.y - 30); y--) {
    const isSkinCenter = skinMap[y * width + centerX] === 1;
    if (!isSkinCenter) {
      detectedHairlineY = y;
      break;
    }
  }

  return {
    imageWidth: width,
    imageHeight: height,
    faceBox,
    leftEye: { centerX: leftEyeX, centerY: leftEyeY, width: faceBox.width * 0.18, height: faceBox.height * 0.10 },
    rightEye: { centerX: rightEyeX, centerY: rightEyeY, width: faceBox.width * 0.18, height: faceBox.height * 0.10 },
    hairline: { centerHairlineY: detectedHairlineY },
    avgEyeY,
  };
}

function isFaceProtectedRegion(normX, normY, landmarks) {
  if (!landmarks) return false;
  const x = normX * landmarks.imageWidth;
  const y = normY * landmarks.imageHeight;
  const fb = landmarks.faceBox;
  const centerX = fb.x + fb.width / 2;

  if (x < fb.x || x > fb.x + fb.width || y < fb.y || y > fb.y + fb.height) {
    return false;
  }

  const le = landmarks.leftEye;
  if (
    x >= le.centerX - le.width * 0.8 &&
    x <= le.centerX + le.width * 0.8 &&
    y >= le.centerY - le.height * 0.9 &&
    y <= le.centerY + le.height * 0.9
  ) return true;

  const re = landmarks.rightEye;
  if (
    x >= re.centerX - re.width * 0.8 &&
    x <= re.centerX + re.width * 0.8 &&
    y >= re.centerY - re.height * 0.9 &&
    y <= re.centerY + re.height * 0.9
  ) return true;

  const minEyeY = Math.min(le.centerY, re.centerY);
  const eyebrowY = Math.round(minEyeY - fb.height * 0.08);
  if (y >= landmarks.hairline.centerHairlineY && y <= minEyeY) {
    if (Math.abs(x - centerX) <= fb.width * 0.28) {
      return true;
    }
  }

  return false;
}

function generateHairMaskRaw(width, height, landmarks) {
  const maskRaw = Buffer.alloc(width * height, 0);
  const centerX = landmarks.faceBox.x + landmarks.faceBox.width / 2;
  const faceWidth = landmarks.faceBox.width;
  const faceHeight = landmarks.faceBox.height;
  const hairlineY = landmarks.hairline.centerHairlineY;
  const eyeLineY = landmarks.avgEyeY;

  for (let y = 0; y < height; y++) {
    const normY = y / height;
    for (let x = 0; x < width; x++) {
      const normX = x / width;
      let maskVal = 0;

      if (!isFaceProtectedRegion(normX, normY, landmarks)) {
        const distFromCenter = Math.abs(x - centerX);
        const earLevelY = eyeLineY + faceHeight * 0.18;

        if (y < hairlineY) {
          maskVal = 255;
        } else if (y >= hairlineY && y <= earLevelY) {
          if (distFromCenter > faceWidth * 0.28) {
            maskVal = 255;
          }
        }
      }
      maskRaw[y * width + x] = maskVal;
    }
  }
  return maskRaw;
}

async function run() {
  const origBuf = fs.readFileSync('storage/test_replicate_lowfade.jpg');
  const meta = await sharp(origBuf).metadata();
  console.log('Original image dimensions:', meta.width, meta.height);

  const landmarks = await extractFaceLandmarks(origBuf, meta.width, meta.height);
  console.log('Landmarks:', JSON.stringify(landmarks, null, 2));

  const maskRaw = generateHairMaskRaw(meta.width, meta.height, landmarks);
  const maskPng = await sharp(maskRaw, { raw: { width: meta.width, height: meta.height, channels: 1 } }).png().toBuffer();
  fs.writeFileSync('storage/debug_mask.png', maskPng);
  console.log('Saved storage/debug_mask.png');

  let whiteCount = 0;
  let blackCount = 0;
  for (let i = 0; i < maskRaw.length; i++) {
    if (maskRaw[i] === 255) whiteCount++;
    else blackCount++;
  }
  console.log('White pixels:', whiteCount, 'Black pixels:', blackCount, 'White %:', ((whiteCount / maskRaw.length) * 100).toFixed(2) + '%');
}

run().catch(console.error);
