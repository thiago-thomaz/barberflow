/**
 * Cross-platform Database Backup Script for BarberFlow
 * Supports automated backups for PostgreSQL (pg_dump) and SQLite.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const backupDir = path.join(__dirname, '..', 'backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const dbUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';

console.log(`[BACKUP] Starting database backup at ${new Date().toISOString()}...`);

if (dbUrl.startsWith('file:') || dbUrl.endsWith('.db')) {
  // SQLite backup
  let rawPath = dbUrl.replace('file:', '').replace('./', '');
  let resolvedDbPath = path.join(__dirname, '..', rawPath);

  if (!fs.existsSync(resolvedDbPath)) {
    // Fallback to prisma/dev.db
    resolvedDbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
  }

  const backupPath = path.join(backupDir, `backup-sqlite-${timestamp}.db`);

  if (fs.existsSync(resolvedDbPath)) {
    fs.copyFileSync(resolvedDbPath, backupPath);
    console.log(`[BACKUP SUCCESS] SQLite backup saved to: ${backupPath}`);
  } else {
    console.error(`[BACKUP ERROR] Database file not found at: ${resolvedDbPath}`);
    process.exit(1);
  }
} else {
  // PostgreSQL backup
  const backupFile = path.join(backupDir, `backup-postgres-${timestamp}.sql.gz`);
  try {
    execSync(`pg_dump "${dbUrl}" | gzip > "${backupFile}"`, { stdio: 'inherit' });
    console.log(`[BACKUP SUCCESS] PostgreSQL backup saved to: ${backupFile}`);
  } catch (err) {
    console.error(`[BACKUP ERROR] pg_dump failed: ${err.message}`);
    process.exit(1);
  }
}
