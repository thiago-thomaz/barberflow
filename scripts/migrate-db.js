const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const nodeScript = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const statements = [
    'ALTER TABLE WhatsappSession ADD COLUMN context TEXT;',
    'ALTER TABLE WhatsappMessage ADD COLUMN providerMessageId TEXT;',
    'ALTER TABLE WhatsappMessage ADD COLUMN appointmentId TEXT;',
    'ALTER TABLE Barbershop ADD COLUMN whatsappActive BOOLEAN DEFAULT 1;',
    'ALTER TABLE Barbershop ADD COLUMN reminder24h BOOLEAN DEFAULT 1;',
    'ALTER TABLE Barbershop ADD COLUMN reminder6h BOOLEAN DEFAULT 1;',
    'ALTER TABLE Barbershop ADD COLUMN reminder2h BOOLEAN DEFAULT 1;',
    'ALTER TABLE Barbershop ADD COLUMN reminder1h BOOLEAN DEFAULT 1;'
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

  await runRemoteCommand(`cat <<'EOF' > /tmp/migrate_db.js\n${nodeScript}\nEOF`);
  await runRemoteCommand(`docker cp /tmp/migrate_db.js 7ho00pvb569n5m3jgee0fnsi-193132644362:/app/migrate_db.js`);
  const res = await runRemoteCommand(`docker exec 7ho00pvb569n5m3jgee0fnsi-193132644362 node /app/migrate_db.js`);
  console.log(res.stdout || res.stderr);
}

main().catch(console.error);
