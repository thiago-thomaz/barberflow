const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const containerRes = await runRemoteCommand('docker ps -q --filter name=7ho00');
  const containerId = (containerRes.stdout || '').trim().split('\n')[0];

  const script = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const shop = await prisma.barbershop.findFirst({ where: { phone: { contains: '988016163' } } });
  console.log('Shop:', shop?.name, shop?.id);
  const hours = await prisma.businessHours.findMany({ where: { barbershopId: shop?.id } });
  console.log('Hours:', JSON.stringify(hours, null, 2));
  process.exit(0);
}
run();
`;

  await runRemoteCommand(`cat <<'EOF' > /tmp/check_hours.js\n${script}\nEOF`);
  await runRemoteCommand(`docker cp /tmp/check_hours.js ${containerId}:/app/check_hours.js`);
  const res = await runRemoteCommand(`docker exec ${containerId} node /app/check_hours.js`);
  console.log(res.stdout || res.stderr);
}

main().catch(console.error);
