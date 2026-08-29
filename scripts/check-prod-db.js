const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const nodeScript = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function check() {
  const shops = await prisma.barbershop.findMany({
    include: { services: true, barbers: true }
  });
  console.log('SHOPS IN DB:', JSON.stringify(shops, null, 2));
}
check().catch(console.error);
`;

  await runRemoteCommand(`cat <<'EOF' > /tmp/check_db.js\n${nodeScript}\nEOF`);
  await runRemoteCommand(`docker cp /tmp/check_db.js 7ho00pvb569n5m3jgee0fnsi-005335797645:/app/check_db.js`);
  const res = await runRemoteCommand(`docker exec 7ho00pvb569n5m3jgee0fnsi-005335797645 node /app/check_db.js`);
  console.log(res.stdout || res.stderr);
}

main().catch(console.error);
