const { runRemoteCommand } = require('./vps-exec');
const fs = require('fs');
const path = require('path');

async function backupToCloud() {
  const content = fs.readFileSync(path.join(__dirname, '../CREDENTIALS.md'), 'utf-8');
  const b64 = Buffer.from(content).toString('base64');
  
  await runRemoteCommand(`echo "${b64}" | base64 -d > /root/CREDENTIALS_BARBERFLOW.md`);
  await runRemoteCommand(`chmod 600 /root/CREDENTIALS_BARBERFLOW.md`);
  console.log('✅ Saved /root/CREDENTIALS_BARBERFLOW.md on VPS with secure permissions (600)');
}

backupToCloud().catch(console.error);
