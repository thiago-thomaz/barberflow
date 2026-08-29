const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const apiKey = 'bf_waha_sec_9e06180371424a1b80c355fb5dc21182';

  console.log('--- 1. Create session default ---');
  let res = await runRemoteCommand(`curl -s -X POST -H "Content-Type: application/json" -H "X-Api-Key: ${apiKey}" -d '{"name":"default"}' https://evo.projetosunion.cloud/api/sessions`);
  console.log('Create result:', res.stdout);

  console.log('--- 2. Start session default ---');
  res = await runRemoteCommand(`curl -s -X POST -H "X-Api-Key: ${apiKey}" https://evo.projetosunion.cloud/api/sessions/default/start`);
  console.log('Start result:', res.stdout);
}

main().catch(console.error);
