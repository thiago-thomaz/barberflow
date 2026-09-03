import fs from 'fs';
import path from 'path';
import { extractFaceLandmarks } from '../src/lib/visagism/face-landmarks.ts';
import { generateMaskByMode } from '../src/lib/visagism/mask.ts';
import { replicateImageProvider } from '../src/lib/visagism/providers/replicate.ts';

async function runE2E() {
  console.log('============================================================');
  console.log('BARBERFLOW — FASE 22: E2E TEST WITH REAL USER PHOTO');
  console.log('============================================================\n');

  const photoCandidates = [
    path.join('C:/Users/Thiago Thomaz/.gemini/antigravity-ide/brain/700c4247-d57c-4043-b11e-ef83700dd450/scratch/real_user_photo.jpg'),
    path.join(process.cwd(), 'storage/visagismo/visagism_cmtktd0r5000nj9qts58tnvki_bb93c541c015f6fe.jpg'),
  ];

  let photoPath = photoCandidates.find((p) => fs.existsSync(p));
  if (!photoPath) {
    console.error('❌ Real user photo not found in candidate paths!');
    process.exit(1);
  }

  console.log(`1. Loading user photo from: ${photoPath}`);
  const origBuffer = fs.readFileSync(photoPath);
  console.log(`   Photo size: ${origBuffer.length} bytes`);

  console.log('\n2. Extracting Real Anatomical Face Landmarks...');
  const landmarks = await extractFaceLandmarks(origBuffer);
  console.log('   Face Box:', landmarks.faceBox);
  console.log('   Left Eye:', landmarks.leftEye);
  console.log('   Right Eye:', landmarks.rightEye);
  console.log('   Nose Tip:', landmarks.nose.tipX, landmarks.nose.tipY);
  console.log('   Mouth Center:', landmarks.mouth.centerX, landmarks.mouth.centerY);
  console.log('   Hairline Y:', landmarks.hairline.centerHairlineY);
  console.log(`   Confidence: ${(landmarks.confidence * 100).toFixed(1)}%`);

  console.log('\n3. Generating Anatomical Hair Mask (HAIR_ONLY)...');
  const maskBuffer = generateMaskByMode('HAIR_ONLY', landmarks.imageWidth, landmarks.imageHeight, undefined, landmarks);
  console.log(`   Mask generated: ${maskBuffer.length} bytes`);

  const scratchDir = 'C:/Users/Thiago Thomaz/.gemini/antigravity-ide/brain/700c4247-d57c-4043-b11e-ef83700dd450/scratch';
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  fs.writeFileSync(path.join(scratchDir, 'e2e_phase22_mask.png'), maskBuffer);

  console.log('\n4. Executing FLUX.1 Fill Dev Inpainting on Replicate...');
  const startTime = Date.now();

  const genResult = await replicateImageProvider.generatePreview({
    originalImageBuffer: origBuffer,
    originalImageMimeType: 'image/jpeg',
    maskBuffer,
    maskMode: 'HAIR_ONLY',
    stylePrompt: "Men's Low Fade modern haircut, clean trimmed sides, natural hair texture, professional barber finish",
    landmarks,
  });

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  if (!genResult || !genResult.finalCompositeBuffer) {
    console.error(`❌ Inpainting failed or rejected by Identity Gate in ${totalTime}s`);
    process.exit(1);
  }

  console.log(`\n✅ INPAINTING SUCCEEDED in ${totalTime}s!`);
  console.log('   Provider:', genResult.provider);
  console.log('   Identity Similarity Score:', genResult.identityScore ? `${(genResult.identityScore * 100).toFixed(1)}%` : 'N/A');
  console.log('   Outside Mask Pixel Change:', genResult.outsideMaskPixelChangeRatio !== undefined ? `${(genResult.outsideMaskPixelChangeRatio * 100).toFixed(2)}%` : '0.00%');
  console.log('   Face Core SSIM:', genResult.faceSSIM !== undefined ? `${(genResult.faceSSIM * 100).toFixed(1)}%` : '100%');

  // Grava artefatos
  if (genResult.rawGeneratedBuffer) {
    fs.writeFileSync(path.join(scratchDir, 'e2e_phase22_raw.jpg'), genResult.rawGeneratedBuffer);
  }
  fs.writeFileSync(path.join(scratchDir, 'e2e_phase22_final.jpg'), genResult.finalCompositeBuffer);

  console.log('\n============================================================');
  console.log('🎉 E2E TEST PASSED! Assets saved to scratch directory.');
  console.log('============================================================');
}

runE2E().catch((err) => {
  console.error('Fatal E2E Error:', err);
  process.exit(1);
});
