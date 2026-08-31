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
    \`CREATE TABLE IF NOT EXISTS "VisagismSession" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "barbershopId" TEXT NOT NULL,
      "customerId" TEXT,
      "publicToken" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'DRAFT',
      "consentAt" DATETIME,
      "photoStorageKey" TEXT,
      "photoMimeType" TEXT,
      "photoSize" INTEGER,
      "photoDeletedAt" DATETIME,
      "expiresAt" DATETIME NOT NULL,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "VisagismSession_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "VisagismSession_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    );\`,
    \`CREATE UNIQUE INDEX IF NOT EXISTS "VisagismSession_publicToken_key" ON "VisagismSession"("publicToken");\`,
    \`CREATE INDEX IF NOT EXISTS "VisagismSession_barbershopId_idx" ON "VisagismSession"("barbershopId");\`,
    \`CREATE INDEX IF NOT EXISTS "VisagismSession_publicToken_idx" ON "VisagismSession"("publicToken");\`,
    \`CREATE INDEX IF NOT EXISTS "VisagismSession_customerId_idx" ON "VisagismSession"("customerId");\`,
    \`CREATE INDEX IF NOT EXISTS "VisagismSession_status_idx" ON "VisagismSession"("status");\`,
    \`CREATE INDEX IF NOT EXISTS "VisagismSession_expiresAt_idx" ON "VisagismSession"("expiresAt");\`,

    \`CREATE TABLE IF NOT EXISTS "VisagismProfile" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "sessionId" TEXT NOT NULL,
      "objective" TEXT NOT NULL,
      "style" TEXT NOT NULL,
      "changeLevel" TEXT NOT NULL,
      "maintenanceLevel" TEXT NOT NULL,
      "hairLength" TEXT NOT NULL,
      "faceShape" TEXT NOT NULL,
      "colorPreference" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "VisagismProfile_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VisagismSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );\`,
    \`CREATE UNIQUE INDEX IF NOT EXISTS "VisagismProfile_sessionId_key" ON "VisagismProfile"("sessionId");\`,
    \`CREATE INDEX IF NOT EXISTS "VisagismProfile_sessionId_idx" ON "VisagismProfile"("sessionId");\`,

    \`CREATE TABLE IF NOT EXISTS "VisagismRecommendation" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "sessionId" TEXT NOT NULL,
      "haircutName" TEXT NOT NULL,
      "haircutStyle" TEXT NOT NULL,
      "beardName" TEXT,
      "hairColor" TEXT,
      "maintenance" TEXT NOT NULL,
      "reasoning" TEXT NOT NULL,
      "barberTips" TEXT,
      "serviceSuggestionId" TEXT,
      "referenceImageUrl" TEXT,
      "score" REAL NOT NULL DEFAULT 80.0,
      "isSelected" BOOLEAN NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "VisagismRecommendation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VisagismSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );\`,
    \`CREATE INDEX IF NOT EXISTS "VisagismRecommendation_sessionId_idx" ON "VisagismRecommendation"("sessionId");\`,
    \`CREATE INDEX IF NOT EXISTS "VisagismRecommendation_isSelected_idx" ON "VisagismRecommendation"("isSelected");\`,

    \`CREATE TABLE IF NOT EXISTS "VisagismMetric" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "barbershopId" TEXT NOT NULL,
      "sessionId" TEXT,
      "eventName" TEXT NOT NULL,
      "metadata" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "VisagismMetric_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "VisagismMetric_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VisagismSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    );\`,
    \`CREATE INDEX IF NOT EXISTS "VisagismMetric_barbershopId_idx" ON "VisagismMetric"("barbershopId");\`,
    \`CREATE INDEX IF NOT EXISTS "VisagismMetric_sessionId_idx" ON "VisagismMetric"("sessionId");\`,
    \`CREATE INDEX IF NOT EXISTS "VisagismMetric_eventName_idx" ON "VisagismMetric"("eventName");\`,
    \`CREATE INDEX IF NOT EXISTS "VisagismMetric_createdAt_idx" ON "VisagismMetric"("createdAt");\`
  ];

  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log('EXECUTED:', sql.split('\\n')[0]);
    } catch (e) {
      console.log('NOTICE:', sql.split('\\n')[0], '->', e.message);
    }
  }
}

run().catch(console.error);
`;

  await runRemoteCommand(`cat <<'EOF' > /tmp/migrate_visagismo.js\n${nodeScript}\nEOF`);
  await runRemoteCommand(`docker cp /tmp/migrate_visagismo.js ${container}:/app/migrate_visagismo.js`);
  const res = await runRemoteCommand(`docker exec ${container} node /app/migrate_visagismo.js`);
  console.log(res.stdout || res.stderr);
}

main().catch(console.error);
