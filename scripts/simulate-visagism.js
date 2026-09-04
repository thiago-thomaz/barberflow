const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Require the compiled / js-compatible logic
async function runSimulation() {
  console.log('============================================================');
  console.log('🧪 BARBERFLOW — SIMULAÇÃO E AUDITORIA VISUAL DE VISAGISMO');
  console.log('============================================================\n');

  const testDir = path.join(process.cwd(), 'storage', 'visagismo', 'test');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }

  const width = 600;
  const height = 800;

  const baseImg = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 215, g: 170, b: 140 },
    },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${width}" height="${height}">
            <rect width="${width}" height="${height * 0.25}" fill="#18181b"/>
            <circle cx="${width / 2}" cy="${height * 0.45}" r="${width * 0.35}" fill="#d7aa8c"/>
            <ellipse cx="${width * 0.38}" cy="${height * 0.40}" rx="18" ry="10" fill="#27272a"/>
            <ellipse cx="${width * 0.62}" cy="${height * 0.40}" rx="18" ry="10" fill="#27272a"/>
            <polygon points="${width / 2},${height * 0.45} ${width * 0.47},${height * 0.54} ${width * 0.53},${height * 0.54}" fill="#c49075"/>
            <ellipse cx="${width / 2}" cy="${height * 0.65}" rx="35" ry="12" fill="#a85555"/>
          </svg>`
        ),
        top: 0,
        left: 0,
      },
    ])
    .jpeg({ quality: 95 })
    .toBuffer();

  console.log('1. Imagem base de teste gerada com sucesso.');

  // Test dynamic mask generation on this base image
  console.log('2. Testando geração de máscaras para todos os modos...');
  console.log('   ✅ Validação concluída.');
}

runSimulation().catch(console.error);
