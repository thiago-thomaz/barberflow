const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const containerId = (await runRemoteCommand('docker ps -q --filter ancestor=7ho00pvb569n5m3jgee0fnsi:09b2529b77a31f98d4284be7c23008ac5695aea1')).stdout.trim();
  const cmd = `docker exec ${containerId} node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); p.educationProgress.findMany().then(r => console.log(JSON.stringify(r)))"`;
  const res = await runRemoteCommand(cmd);
  console.log('Progress records in DB:', res.stdout || res.stderr);
}

main().catch(console.error);
