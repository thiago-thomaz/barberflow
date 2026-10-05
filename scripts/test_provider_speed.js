const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const rootDir = 'c:\\Users\\Thiago Thomaz\\OneDrive\\Documentos\\AntiGravity - Projetos\\Barbearia';
const { ReplicateInpaintingVisagismProvider } = require(path.join(rootDir, 'src/lib/visagism/providers/replicate.ts'));

async function testProviderSpeed() {
  process.env.VISAGISM_INPAINT_MODEL = process.env.VISAGISM_INPAINT_MODEL || 'black-forest-labs/flux-fill-pro';

  // Create test 576x1024 image
  const imgBuffer = await sharp({
    create: { width: 576, height: 1024, channels: 3, background: { r: 160, g: 130, b: 100 } }
  }).jpeg().toBuffer();

  const provider = new ReplicateInpaintingVisagismProvider();
  console.log('Testing generatePreview with flux-fill-pro...');
  const start = Date.now();
  const result = await provider.generatePreview({
    originalImageBuffer: imgBuffer,
    originalImageMimeType: 'image/jpeg',
    stylePrompt: 'A photorealistic portrait photograph of this man with low fade haircut',
    maskMode: 'HAIR_AND_BEARD'
  });

  const duration = Date.now() - start;
  console.log('Result:', result ? 'SUCCESS' : 'NULL', 'Duration:', duration + 'ms');
  if (result) {
    console.log('Image URL:', result.imageUrl);
    console.log('Face SSIM:', result.faceSSIM);
  }
}

testProviderSpeed().catch(console.error);
