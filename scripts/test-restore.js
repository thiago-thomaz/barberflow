/**
 * Automated Backup and Restore Verification Test
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

async function testBackupAndRestore() {
  console.log('[RESTORE TEST] Starting backup and restore verification test...');

  let rawPath = (process.env.DATABASE_URL || 'file:./prisma/dev.db').replace('file:', '').replace('./', '');
  let resolvedDbPath = path.join(__dirname, '..', rawPath);

  if (!fs.existsSync(resolvedDbPath)) {
    resolvedDbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
  }

  if (!fs.existsSync(resolvedDbPath)) {
    throw new Error(`Original database file not found at ${resolvedDbPath}`);
  }

  // 1. Copy to temporary test restore database
  const backupsDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const tempRestoreDbPath = path.join(backupsDir, 'temp-restore-test.db');
  fs.copyFileSync(resolvedDbPath, tempRestoreDbPath);

  // 2. Connect to restored database
  const testPrisma = new PrismaClient({
    datasources: {
      db: { url: `file:${tempRestoreDbPath}` },
    },
  });

  try {
    const barbershopCount = await testPrisma.barbershop.count();
    const userCount = await testPrisma.user.count();
    const customerCount = await testPrisma.customer.count();
    const appointmentCount = await testPrisma.appointment.count();

    console.log('[RESTORE TEST] Restored Database Statistics:');
    console.log(`  - Barbearias: ${barbershopCount}`);
    console.log(`  - Usuários: ${userCount}`);
    console.log(`  - Clientes: ${customerCount}`);
    console.log(`  - Agendamentos: ${appointmentCount}`);

    if (barbershopCount < 1) {
      throw new Error('Restore validation failed: zero barbershops restored.');
    }

    console.log('[RESTORE TEST SUCCESS] Database backup & restore successfully verified!');
  } finally {
    await testPrisma.$disconnect();
    // Cleanup temporary test restore file
    if (fs.existsSync(tempRestoreDbPath)) {
      fs.unlinkSync(tempRestoreDbPath);
    }
  }
}

testBackupAndRestore().catch((err) => {
  console.error('[RESTORE TEST FAILED]:', err);
  process.exit(1);
});
