const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const apiKey = 'f8753da3e47a47af90ce8daa66be3b7f';
  const containerIp = '10.0.1.14';

  console.log('--- 1. Start Session default ---');
  let res = await runRemoteCommand(`curl -s -X POST -H "X-Api-Key: ${apiKey}" http://${containerIp}:80/api/sessions/default/start`);
  console.log('Start result:', res.stdout);

  console.log('Waiting 5s for browser launch...');
  await new Promise(r => setTimeout(r, 5000));

  console.log('--- 2. Check Session Status ---');
  res = await runRemoteCommand(`curl -s -H "X-Api-Key: ${apiKey}" http://${containerIp}:80/api/sessions/default`);
  console.log('Status:', res.stdout);

  console.log('--- 3. Get QR Code Raw ---');
  res = await runRemoteCommand(`curl -s -H "X-Api-Key: ${apiKey}" http://${containerIp}:80/api/default/auth/qr`);
  console.log('QR Raw length:', (res.stdout || '').length);
}

main().catch(console.error);
