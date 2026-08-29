const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const nodeScript = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS WhatsappSession;');
    await prisma.$executeRawUnsafe(\`
      CREATE TABLE WhatsappSession (
        id TEXT PRIMARY KEY NOT NULL,
        barbershopId TEXT NOT NULL,
        phone TEXT NOT NULL,
        state TEXT NOT NULL DEFAULT 'IDLE',
        context TEXT,
        expiresAt DATETIME NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT WhatsappSession_barbershopId_fkey FOREIGN KEY (barbershopId) REFERENCES Barbershop (id) ON DELETE CASCADE ON UPDATE CASCADE
      );
    \`);
    await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX WhatsappSession_barbershopId_phone_key ON WhatsappSession (barbershopId, phone);');
    await prisma.$executeRawUnsafe('CREATE INDEX WhatsappSession_phone_idx ON WhatsappSession (phone);');
    await prisma.$executeRawUnsafe('CREATE INDEX WhatsappSession_expiresAt_idx ON WhatsappSession (expiresAt);');
    console.log('RECREATED WhatsappSession table successfully!');
  } catch (e) {
    console.error('Error recreating table:', e);
  }
}

run().catch(console.error);
`;

  await runRemoteCommand(`cat <<'EOF' > /tmp/migrate_session.js\n${nodeScript}\nEOF`);
  await runRemoteCommand(`docker cp /tmp/migrate_session.js 7ho00pvb569n5m3jgee0fnsi-193132644362:/app/migrate_session.js`);
  const res = await runRemoteCommand(`docker exec 7ho00pvb569n5m3jgee0fnsi-193132644362 node /app/migrate_session.js`);
  console.log(res.stdout || res.stderr);
}

main().catch(console.error);
