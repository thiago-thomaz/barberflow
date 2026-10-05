const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const rootDir = 'c:\\Users\\Thiago Thomaz\\OneDrive\\Documentos\\AntiGravity - Projetos\\Barbearia';
const { extractFaceLandmarks } = require(path.join(rootDir, 'src/lib/visagism/face-landmarks.ts'));
const { compositeInpaintingResult } = require(path.join(rootDir, 'src/lib/visagism/composite.ts'));

async function testFacePreservation() {
  const token = process.env.REPLICATE_API_TOKEN;
  const imgBuffer = fs.readFileSync('C:\\Users\\Thiago Thomaz\\.gemini\\antigravity-ide\\brain\\535b4271-6723-4497-a77a-c6c74090a5dd\\.user_uploaded\\media_1788536802280.png');
  const meta = await sharp(imgBuffer).metadata();
  const width = meta.width;
  const height = meta.height;

  const lm = await extractFaceLandmarks(imgBuffer, width, height);
  const leftEyeX = lm.leftEye.centerX;
  const rightEyeX = lm.rightEye.centerX;
  const eyeDistance = Math.abs(rightEyeX - leftEyeX);
  const centerX = (leftEyeX + rightEyeX) / 2;
  const eyeLineY = (lm.leftEye.centerY + lm.rightEye.centerY) / 2;
  const minEyeY = Math.min(lm.leftEye.centerY, lm.rightEye.centerY);
  const hairlineY = lm.hairline.centerHairlineY;
  const earLevelY = eyeLineY + eyeDistance * 0.55;
  const noseTipY = lm.nose.tipY;
  const mouthY = lm.mouth.centerY;
  const upperLipY = lm.mouth.upperLipY;
  const lowerLipY = lm.mouth.lowerLipY;
  const chinY = lm.jawline.chinTipY;
  const faceWidth = eyeDistance * 2.25;

  // Build high-precision face-protected mask
  const maskBuf = Buffer.alloc(width * height, 0);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const distFromCenter = Math.abs(x - centerX);

      // 1. ZONA DE PROTEÇÃO TOTAL DO ROSTO (Olhos, Sobrancelhas, Nariz, Bochechas, Lábios, Philtrum, Centro do Queixo, Testa)
      // A. Olhos e Sobrancelhas
      const isEyeLeft = Math.abs(x - leftEyeX) <= eyeDistance * 0.42 && Math.abs(y - lm.leftEye.centerY) <= eyeDistance * 0.35;
      const isEyeRight = Math.abs(x - rightEyeX) <= eyeDistance * 0.42 && Math.abs(y - lm.rightEye.centerY) <= eyeDistance * 0.35;
      // B. Nariz completo e Bochechas internas
      const isNoseAndCheeks = y >= minEyeY - eyeDistance * 0.10 && y <= mouthY + eyeDistance * 0.15 && distFromCenter <= eyeDistance * 0.65;
      // C. Boca, Lábios e Bigode central
      const isMouthArea = y >= upperLipY - eyeDistance * 0.10 && y <= lowerLipY + eyeDistance * 0.15 && distFromCenter <= Math.max(eyeDistance * 0.55, lm.mouth.width * 0.65);
      // D. Testa central
      const isForehead = y >= hairlineY && y <= minEyeY && distFromCenter <= eyeDistance * 0.60;
      // E. Centro do queixo
      const isChinCenter = y > lowerLipY && y <= chinY && distFromCenter <= eyeDistance * 0.40;

      const isProtectedFace = isEyeLeft || isEyeRight || isNoseAndCheeks || isMouthArea || isForehead || isChinCenter;

      if (isProtectedFace) {
        maskBuf[idx] = 0; // 100% Preservado da foto original
      } else {
        // CABELO:
        // Topo da cabeça acima da linha da testa
        if (y < hairlineY) {
          maskBuf[idx] = 255;
        }
        // Têmporas, fade, laterais e costeletas
        else if (y >= hairlineY && y <= earLevelY && distFromCenter > eyeDistance * 0.55) {
          maskBuf[idx] = 255;
        }
        // BARBA: Mandíbula externa, pescoço e contorno inferior
        else if (y > earLevelY && y <= Math.min(height - 1, chinY + eyeDistance * 0.55)) {
          // Contorno externo da mandíbula / costeletas em fade
          if (distFromCenter >= eyeDistance * 0.65 && distFromCenter <= faceWidth * 0.95) {
            maskBuf[idx] = 255;
          }
          // Pescoço e linha inferior da mandíbula
          else if (y >= chinY - eyeDistance * 0.05 && distFromCenter <= faceWidth * 0.85) {
            maskBuf[idx] = 255;
          }
        }
        // Fundo lateral ao lado da cabeça
        else if (y > earLevelY && y <= chinY && distFromCenter > faceWidth * 0.60) {
          maskBuf[idx] = 255;
        }
      }
    }
  }

  const maskPng = await sharp(maskBuf, { raw: { width, height, channels: 1 } }).png().toBuffer();
  fs.writeFileSync(path.join(rootDir, 'test_face_protected_mask.png'), maskPng);
  console.log('Generated test_face_protected_mask.png');

  // Verify mask ratio
  let editPixels = 0;
  for (let i = 0; i < maskBuf.length; i++) {
    if (maskBuf[i] === 255) editPixels++;
  }
  console.log('Edit area ratio:', ((editPixels / (width * height)) * 100).toFixed(2) + '%');
}

testFacePreservation().catch(console.error);
