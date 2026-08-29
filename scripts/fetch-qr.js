const { runRemoteCommand } = require('./vps-exec');
const fs = require('fs');
const path = require('path');

async function downloadQR() {
  const artifactDir = 'C:\\Users\\Thiago Thomaz\\.gemini\\antigravity-ide\\brain\\da024a78-8ad1-432e-9a59-3c6e7ddc48e0';
  const destPath = path.join(artifactDir, 'waha_qrcode.png');
  const apiKey = 'bf_waha_sec_9e06180371424a1b80c355fb5dc21182';

  const res = await runRemoteCommand(`curl -s -H "X-Api-Key: ${apiKey}" https://evo.projetosunion.cloud/api/default/auth/qr | base64 -w 0`);
  const buffer = Buffer.from(res.stdout.trim(), 'base64');
  fs.writeFileSync(destPath, buffer);
  console.log('Saved QR Code to:', destPath, 'Size:', buffer.length);
}

downloadQR().catch(console.error);
