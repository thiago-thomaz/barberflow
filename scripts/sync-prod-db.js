const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const containerRes = await runRemoteCommand('docker ps -q --filter name=7ho00pvb569n5m3jgee0fnsi');
  const containerId = containerRes.stdout.trim().split('\n')[0];
  console.log('Active Container:', containerId);

  const jsScript = `
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    async function run() {
      await p.$executeRawUnsafe(\`
        CREATE TABLE IF NOT EXISTS "AcademyDiagnostic" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "barbershopId" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "answersJson" TEXT NOT NULL,
          "realMetricsJson" TEXT,
          "healthScore" INTEGER NOT NULL,
          "healthCategory" TEXT NOT NULL,
          "prioritiesJson" TEXT NOT NULL,
          "biggestProblem" TEXT,
          "missingDataJson" TEXT,
          "status" TEXT NOT NULL DEFAULT 'COMPLETED',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "AcademyDiagnostic_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "AcademyDiagnostic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
      \`);
      await p.$executeRawUnsafe(\`
        CREATE TABLE IF NOT EXISTS "AcademyActionPlan" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "barbershopId" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "diagnosticId" TEXT,
          "title" TEXT NOT NULL,
          "problem" TEXT NOT NULL,
          "whyItMatters" TEXT NOT NULL,
          "action" TEXT NOT NULL,
          "howTo" TEXT NOT NULL,
          "deadlineDays" INTEGER NOT NULL DEFAULT 7,
          "targetDeadline" DATETIME,
          "indicator" TEXT NOT NULL,
          "recommendedCategory" TEXT,
          "recommendedContentIds" TEXT,
          "recommendedToolId" TEXT,
          "recommendedChecklistId" TEXT,
          "status" TEXT NOT NULL DEFAULT 'PENDENTE',
          "completedAt" DATETIME,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "AcademyActionPlan_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "AcademyActionPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT "AcademyActionPlan_diagnosticId_fkey" FOREIGN KEY ("diagnosticId") REFERENCES "AcademyDiagnostic" ("id") ON DELETE SET NULL ON UPDATE CASCADE
        )
      \`);
      await p.$executeRawUnsafe(\`
        CREATE TABLE IF NOT EXISTS "AcademyDiagnosticSnapshot" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "barbershopId" TEXT NOT NULL,
          "score" INTEGER NOT NULL,
          "category" TEXT NOT NULL,
          "metricsJson" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "AcademyDiagnosticSnapshot_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        )
      \`);
      console.log('✅ SQLite Schema updated successfully inside production container!');
    }
    run().catch(e => { console.error('Error:', e); process.exit(1); });
  `;

  const b64 = Buffer.from(jsScript).toString('base64');
  const res = await runRemoteCommand(`docker exec ${containerId} node -e "eval(Buffer.from('${b64}', 'base64').toString('utf8'))"`);
  console.log(res.stdout || res.stderr);
}

main().catch(console.error);
