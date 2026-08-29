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
    'ALTER TABLE Appointment ADD COLUMN rescheduledFromId TEXT;',
    'ALTER TABLE Appointment ADD COLUMN rescheduledToId TEXT;',
    'ALTER TABLE Appointment ADD COLUMN origin TEXT DEFAULT "WEB";',
    'ALTER TABLE Appointment ADD COLUMN cancelReason TEXT;',
    'ALTER TABLE Appointment ADD COLUMN cancelledAt DATETIME;',
    'ALTER TABLE Appointment ADD COLUMN startedAt DATETIME;',
    'ALTER TABLE Appointment ADD COLUMN completedAt DATETIME;',
    'ALTER TABLE Appointment ADD COLUMN idempotencyKey TEXT;',
    'ALTER TABLE Appointment ADD COLUMN serviceNameSnapshot TEXT;',
    'ALTER TABLE Appointment ADD COLUMN servicePriceSnapshot REAL;',
    'ALTER TABLE Customer ADD COLUMN marketingOptIn BOOLEAN DEFAULT 1;',
    'ALTER TABLE Customer ADD COLUMN whatsappPhone TEXT;',
    'ALTER TABLE Barbershop ADD COLUMN whatsappApiKey TEXT;',
    'ALTER TABLE Barbershop ADD COLUMN whatsappPhoneId TEXT;'
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

  await runRemoteCommand(`cat <<'EOF' > /tmp/migrate_full.js\n${nodeScript}\nEOF`);
  await runRemoteCommand(`docker cp /tmp/migrate_full.js ${container}:/app/migrate_full.js`);
  const res = await runRemoteCommand(`docker exec ${container} node /app/migrate_full.js`);
  console.log(res.stdout || res.stderr);
}

main().catch(console.error);
