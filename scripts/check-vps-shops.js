const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const containerRes = await runRemoteCommand('docker ps -q --filter name=7ho00');
  const containerId = (containerRes.stdout || '').trim().split('\n')[0];
  
  const scriptContent = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.barbershop.findMany().then(shops => {
  console.log('VPS Shops:', JSON.stringify(shops.map(s => ({ id: s.id, name: s.name, slug: s.slug, phone: s.phone })), null, 2));
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
`;

  await runRemoteCommand(`cat <<'EOF' > /tmp/check_shops.js\n${scriptContent}\nEOF`);
  await runRemoteCommand(`docker cp /tmp/check_shops.js ${containerId}:/app/check_shops.js`);
  const res = await runRemoteCommand(`docker exec ${containerId} node /app/check_shops.js`);
  console.log(res.stdout || res.stderr);
}

main().catch(console.error);
