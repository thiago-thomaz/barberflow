const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const ps = await runRemoteCommand(`docker ps | grep 7ho00 | awk '{print $NF}'`);
  const container = ps.stdout.trim();

  const nodeScript = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const sessions = await prisma.whatsappSession.findMany();
  console.log('ACTIVE SESSIONS:', JSON.stringify(sessions, null, 2));

  // Reset any stuck sessions to IDLE
  await prisma.whatsappSession.updateMany({
    data: { state: 'IDLE', context: '{}' }
  });
  console.log('RESET ALL SESSIONS TO IDLE');
}

run().catch(console.error);
`;

  await runRemoteCommand(`cat <<'EOF' > /tmp/check_sessions.js\n${nodeScript}\nEOF`);
  await runRemoteCommand(`docker cp /tmp/check_sessions.js ${container}:/app/check_sessions.js`);
  const res = await runRemoteCommand(`docker exec ${container} node /app/check_sessions.js`);
  console.log(res.stdout || res.stderr);
}

main().catch(console.error);
