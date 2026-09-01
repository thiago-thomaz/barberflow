const bcrypt = require('bcryptjs');
const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const containerRes = await runRemoteCommand('docker ps -q --filter name=7ho00pvb569n5m3jgee0fnsi');
  const containerId = containerRes.stdout.trim().split('\n')[0];
  console.log('Target container:', containerId);

  const passwordHash = await bcrypt.hash('senha123admin', 10);
  const escapedHash = passwordHash.replace(/\$/g, '\\$');

  const script = `
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function run() {
  const user = await p.user.upsert({
    where: { email: 'admin@barberflow.com' },
    update: { role: 'SUPER_ADMIN', passwordHash: '${escapedHash}' },
    create: {
      name: 'Super Administrador BarberFlow',
      email: 'admin@barberflow.com',
      passwordHash: '${escapedHash}',
      role: 'SUPER_ADMIN',
    },
  });
  console.log('SUPER_ADMIN ensured:', JSON.stringify(user));
}

run().catch(e => { console.error(e); process.exit(1); });
`;

  const cmd = `docker exec ${containerId} node -e "${script.replace(/\n/g, ' ')}"`;
  const res = await runRemoteCommand(cmd);
  console.log('Result:', res.stdout || res.stderr);
}

main().catch(console.error);
