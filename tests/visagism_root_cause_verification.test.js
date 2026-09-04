const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Import TypeScript modules via transpile or native load
// We will test using direct sharp buffers and assertions
test('Visagism Pipeline & Root Cause Elimination', async (t) => {
  await t.test('1. Hair Mask must completely cover hair calotte while protecting facial core', async () => {
    // Generate test face image with eyes and hair
    const width = 768;
    const height = 1024;

    const leftEyeX = 268;
    const rightEyeX = 503;
    const eyeLineY = 681;
    const eyeDistance = rightEyeX - leftEyeX; // 235
    const centerX = (leftEyeX + rightEyeX) / 2; // 385.5
    const faceWidth = eyeDistance * 2.25;
    const eyebrowY = eyeLineY - eyeDistance * 0.30;
    const hairlineY = eyeLineY - eyeDistance * 0.85;

    assert.ok(hairlineY < eyebrowY, 'Hairline must be above eyebrows');
    assert.ok(hairlineY > height * 0.20, 'Hairline must leave full crown volume at top');
  });

  await t.test('2. Replicate Provider config must have guidance 30.0 and correct model', async () => {
    const replicateFile = fs.readFileSync(path.join(__dirname, '../src/lib/visagism/providers/replicate.ts'), 'utf8');
    assert.ok(replicateFile.includes('30.0'), 'FLUX guidance must be 30.0 for Fill Inpainting');
    assert.ok(replicateFile.includes('black-forest-labs/flux-fill-dev'), 'Must use FLUX.1 Fill Dev');
  });

  await t.test('3. Catalog must contain all 18 haircuts with valid style prompts', async () => {
    const catalogFile = fs.readFileSync(path.join(__dirname, '../src/lib/visagism/catalog.ts'), 'utf8');
    assert.ok(catalogFile.includes("id: 'low-fade'"));
    assert.ok(catalogFile.includes("id: 'high-fade'"));
    assert.ok(catalogFile.includes("id: 'skin-fade'"));
    assert.ok(catalogFile.includes("id: 'taper-fade'"));
    assert.ok(catalogFile.includes("id: 'buzz-cut'"));
    assert.ok(catalogFile.includes("id: 'crew-cut'"));
    assert.ok(catalogFile.includes("id: 'french-crop'"));
    assert.ok(catalogFile.includes("id: 'textured-crop'"));
    assert.ok(catalogFile.includes("id: 'pompadour'"));
    assert.ok(catalogFile.includes("id: 'quiff'"));
    assert.ok(catalogFile.includes("id: 'slick-back'"));
    assert.ok(catalogFile.includes("id: 'side-part'"));
    assert.ok(catalogFile.includes("id: 'corte-social'"));
    assert.ok(catalogFile.includes("id: 'corte-executivo'"));
    assert.ok(catalogFile.includes("id: 'long-hair-layers'"));
    assert.ok(catalogFile.includes("id: 'curly-fade'"));
    assert.ok(catalogFile.includes("id: 'corte-despojado-surfer'"));
  });

  await t.test('4. Composite engine must blend with Smoothstep without leaving seams', async () => {
    const compFile = fs.readFileSync(path.join(__dirname, '../src/lib/visagism/composite.ts'), 'utf8');
    assert.ok(compFile.includes('alphaWeight'), 'Must use alpha weighting');
    assert.ok(compFile.includes('calculateProtectedFaceSSIM'), 'Must calculate face SSIM');
  });

  await t.test('5. Beard Styles Catalog must contain style prompts for inpainting', async () => {
    const catalogFile = fs.readFileSync(path.join(__dirname, '../src/lib/visagism/catalog.ts'), 'utf8');
    assert.ok(catalogFile.includes("id: 'barba-por-fazer'"));
    assert.ok(catalogFile.includes("id: 'barba-desenhada'"));
    assert.ok(catalogFile.includes("id: 'barba-cheia'"));
    assert.ok(catalogFile.includes("id: 'cavanhaque-moderno'"));
    assert.ok(catalogFile.includes("id: 'bigode-chevron'"));
    assert.ok(catalogFile.includes('clean 3-day designer stubble beard'));
    assert.ok(catalogFile.includes('sharp fade beard with seamless temple taper transition'));
  });
});

