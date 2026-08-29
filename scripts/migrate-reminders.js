const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const ps = await runRemoteCommand(`docker ps | grep 7ho00 | awk '{print $NF}'`);
  const container = ps.stdout.trim();
  console.log('Target container:', container);

  const nodeScript = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const statements = [
    'ALTER TABLE AppointmentReminder ADD COLUMN updatedAt DATETIME;',
    'ALTER TABLE AppointmentReminder ADD COLUMN attempts INTEGER DEFAULT 0;',
    'ALTER TABLE AppointmentReminder ADD COLUMN error TEXT;',
    'ALTER TABLE AppointmentReminder ADD COLUMN providerMessageId TEXT;'
  ];

  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log('EXECUTED:', sql);
    } catch (e) {
      console.log('NOTICE:', sql, '->', e.message);
    }
  }
}

run().catch(console.error);
`;

  await runRemoteCommand(`cat <<'EOF' > /tmp/migrate_reminders.js\n${nodeScript}\nEOF`);
  await runRemoteCommand(`docker cp /tmp/migrate_reminders.js ${container}:/app/migrate_reminders.js`);
  const res = await runRemoteCommand(`docker exec ${container} node /app/migrate_reminders.js`);
  console.log(res.stdout || res.stderr);
}

main().catch(console.error);
