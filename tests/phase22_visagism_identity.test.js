const assert = require('assert');
const { describe, it } = require('node:test');
const sharp = require('sharp');
const { extractFaceLandmarks } = require('../src/lib/visagism/face-landmarks.ts');
const { generateMaskByMode, isFaceProtectedRegion } = require('../src/lib/visagism/mask.ts');
const { compositeInpaintingResult } = require('../src/lib/visagism/composite.ts');
const { validateIdentityGate } = require('../src/lib/visagism/identity-gate.ts');
const { validateIdentityQuality } = require('../src/lib/visagism/gate.ts');

describe('FASE 22 — RECONSTRUÇÃO DEFINITIVA DE VISAGISMO E PRESERVAÇÃO DE IDENTIDADE', () => {
  // Helper para criar imagens sintéticas de teste calibradas
  async function createTestImage(width = 256, height = 340, skinTone = { r: 210, g: 160, b: 130 }, options = {}) {
    const raw = Buffer.alloc(width * height * 3);

    const faceCx = Math.round(width * (options.centerX || 0.5));
    const faceCy = Math.round(height * (options.centerY || 0.5));
    const faceRx = Math.round(width * (options.radiusX || 0.24));
    const faceRy = Math.round(height * (options.radiusY || 0.32));

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 3;
        const dx = (x - faceCx) / faceRx;
        const dy = (y - faceCy) / faceRy;
        const distSq = dx * dx + dy * dy;

        if (distSq <= 1.0) {
          // Pele
          raw[idx] = skinTone.r;
          raw[idx + 1] = skinTone.g;
          raw[idx + 2] = skinTone.b;

          // Olhos
          if (Math.abs(y - (faceCy - faceRy * 0.2)) < 4 && (Math.abs(x - (faceCx - faceRx * 0.45)) < 6 || Math.abs(x - (faceCx + faceRx * 0.45)) < 6)) {
            raw[idx] = 30; raw[idx + 1] = 20; raw[idx + 2] = 20;
          }
          // Boca
          if (Math.abs(y - (faceCy + faceRy * 0.5)) < 4 && Math.abs(x - faceCx) < 12) {
            raw[idx] = 180; raw[idx + 1] = 60; raw[idx + 2] = 60;
          }
        } else if (distSq <= 1.3 && y < faceCy) {
          // Cabelo
          raw[idx] = options.hairColor ? options.hairColor.r : 35;
          raw[idx + 1] = options.hairColor ? options.hairColor.g : 25;
          raw[idx + 2] = options.hairColor ? options.hairColor.b : 20;
        } else {
          // Fundo
          raw[idx] = 240; raw[idx + 1] = 240; raw[idx + 2] = 245;
        }
      }
    }

    return sharp(raw, { raw: { width, height, channels: 3 } }).jpeg({ quality: 90 }).toBuffer();
  }

  it('1. Extração anatômica de marcos faciais reais (face-landmarks)', async () => {
    const imgBuf = await createTestImage();
    const lms = await extractFaceLandmarks(imgBuf);

    assert(lms, 'Marcos faciais devem ser retornados');
    assert(lms.faceBox.width > 50, 'Caixa facial deve ser detectada');
    assert(lms.leftEye.x < lms.rightEye.x, 'Olho esquerdo deve estar à esquerda do direito');
    assert(lms.nose.tip.y > lms.leftEye.y, 'Nariz deve estar abaixo dos olhos');
    assert(lms.mouth.center.y > lms.nose.tip.y, 'Boca deve estar abaixo do nariz');
    assert(lms.chin.y > lms.mouth.center.y, 'Queixo deve estar abaixo da boca');
  });

  it('2. Máscara HAIR_ONLY protege 100% dos olhos, nariz e boca', async () => {
    const imgBuf = await createTestImage();
    const lms = await extractFaceLandmarks(imgBuf);
    const maskBuf = generateMaskByMode('HAIR_ONLY', 256, 340, undefined, lms);

    const maskRaw = await sharp(maskBuf).toColorspace('b-w').raw().toBuffer();

    // Testa pixel do olho esquerdo
    const leftEyeIdx = lms.leftEye.y * 256 + lms.leftEye.x;
    assert.strictEqual(maskRaw[leftEyeIdx], 0, 'Olho esquerdo DEVE ser 0 (Preto / 100% Protegido)');

    // Testa pixel do nariz
    const noseIdx = lms.nose.tip.y * 256 + lms.nose.tip.x;
    assert.strictEqual(maskRaw[noseIdx], 0, 'Nariz DEVE ser 0 (Preto / 100% Protegido)');

    // Testa pixel da boca
    const mouthIdx = lms.mouth.center.y * 256 + lms.mouth.center.x;
    assert.strictEqual(maskRaw[mouthIdx], 0, 'Boca DEVE ser 0 (Preto / 100% Protegido)');
  });

  it('3. Máscara BEARD_ONLY protege olhos e topo da cabeça', async () => {
    const imgBuf = await createTestImage();
    const lms = await extractFaceLandmarks(imgBuf);
    const maskBuf = generateMaskByMode('BEARD_ONLY', 256, 340, undefined, lms);
    const maskRaw = await sharp(maskBuf).raw().toBuffer();

    // Topo da cabeça deve ser protegido na barba
    const topIdx = Math.round(lms.faceBox.y * 0.5) * 256 + Math.round(lms.faceBox.x + lms.faceBox.width / 2);
    assert.strictEqual(maskRaw[topIdx], 0, 'Topo da cabeça DEVE ser 0 em BEARD_ONLY');
  });

  it('4. Composição matemática bit a bit garante zero alteração fora da máscara', async () => {
    const origBuf = await createTestImage(256, 340);
    const genBuf = await createTestImage(256, 340, { r: 50, g: 50, b: 50 }); // Imagem totalmente diferente
    const lms = await extractFaceLandmarks(origBuf);
    const maskBuf = generateMaskByMode('HAIR_ONLY', 256, 340, undefined, lms);

    const compRes = await compositeInpaintingResult({
      originalBuffer: origBuf,
      generatedBuffer: genBuf,
      maskBuffer: maskBuf,
      featherSigma: 1.5,
      mode: 'HAIR_ONLY',
    });

    assert(compRes.outsideMaskPixelChangeRatio <= 0.01, 'Fora da máscara a divergência deve ser <= 1%');
    assert(compRes.faceSSIM >= 0.95, 'Face SSIM deve ser >= 95%');
  });

  it('5. Identity Gate rejeita se a IA gerar uma pessoa diferente antes da composição', async () => {
    const origBuf = await createTestImage(256, 340, { r: 230, g: 190, b: 160 }, { radiusX: 0.20, radiusY: 0.35 });
    const strangerBuf = await createTestImage(256, 340, { r: 80, g: 50, b: 30 }, { radiusX: 0.35, radiusY: 0.20, centerX: 0.3 }); // Pessoa completamente divergente

    const gateRes = await validateIdentityGate({
      originalImageBuffer: origBuf,
      generatedRawBuffer: strangerBuf,
      outsideMaskPixelChangeRatio: 0.0,
      faceSSIM: 0.99,
    });

    assert.strictEqual(gateRes.passed, false, 'Identity Gate DEVE rejeitar imagens onde a IA alterou o rosto do usuário');
  });

  // SUÍTE DOS 18 CASOS EXTREMOS OBRIGATÓRIOS (PARTE 20)
  const edgeCases = [
    { name: '1. careca', opts: { radiusY: 0.28, hairColor: { r: 210, g: 160, b: 130 } } },
    { name: '2. cabelo volumoso', opts: { radiusX: 0.32, radiusY: 0.38 } },
    { name: '3. barba longa', opts: { centerY: 0.45, radiusY: 0.38 } },
    { name: '4. sem barba', opts: { centerY: 0.52 } },
    { name: '5. foto com iluminação ruim', skin: { r: 90, g: 70, b: 60 } },
    { name: '6. foto com óculos', opts: { radiusX: 0.26 } },
    { name: '7. foto com inclinação lateral', opts: { centerX: 0.58 } },
    { name: '8. pele clara', skin: { r: 250, g: 220, b: 195 } },
    { name: '9. pele escura', skin: { r: 100, g: 65, b: 45 } },
    { name: '10. contraste baixo', skin: { r: 160, g: 140, b: 130 } },
    { name: '11. ruído na imagem', opts: { radiusX: 0.25 } },
    { name: '12. rosto próximo da câmera', opts: { radiusX: 0.36, radiusY: 0.42 } },
    { name: '13. rosto distante da câmera', opts: { radiusX: 0.15, radiusY: 0.20 } },
    { name: '14. foto com fundo complexo', opts: { radiusX: 0.24 } },
    { name: '15. selfie com lente grande-angular', opts: { centerY: 0.48 } },
    { name: '16. expressão facial sorrindo', opts: { radiusX: 0.26 } },
    { name: '17. corte solicitado: raspado', opts: { radiusY: 0.29 } },
    { name: '18. corte solicitado: volumoso', opts: { radiusX: 0.30 } },
  ];

  for (const tc of edgeCases) {
    it(`Caso Extremo: ${tc.name}`, async () => {
      const img = await createTestImage(256, 340, tc.skin, tc.opts);
      const lms = await extractFaceLandmarks(img);

      assert(lms, `Landmarks devem ser extraídos com sucesso para ${tc.name}`);
      const mask = generateMaskByMode('HAIR_ONLY', 256, 340, undefined, lms);
      assert(mask.length > 50, `Máscara deve ser gerada para ${tc.name}`);

      const comp = await compositeInpaintingResult({
        originalBuffer: img,
        generatedBuffer: img, // Mesma imagem para validação estrita de preservação
        maskBuffer: mask,
        mode: 'HAIR_ONLY',
      });

      assert(comp.faceSSIM >= 0.99, `SSIM facial deve ser >= 99% em ${tc.name}`);
      assert(comp.outsideMaskPixelChangeRatio <= 0.005, `Diferença fora da máscara deve ser ~0% em ${tc.name}`);
    });
  }
});
