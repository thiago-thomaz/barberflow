import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  schemaSynced: boolean | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Ensures any newly added columns or tables exist in production SQLite database
 */
export async function ensureDatabaseSchema() {
  if (globalForPrisma.schemaSynced) return;
  globalForPrisma.schemaSynced = true;

  try {
    // 1. Check existing columns in Barbershop
    const barbershopCols = await prisma.$queryRawUnsafe<Array<{ name: string }>>('PRAGMA table_info("Barbershop")').catch(() => []);
    const shopColNames = new Set(barbershopCols.map(c => c.name));

    if (!shopColNames.has('whatsappActive')) {
      await prisma.$executeRawUnsafe('ALTER TABLE "Barbershop" ADD COLUMN "whatsappActive" BOOLEAN DEFAULT 1').catch(() => {});
    }
    if (!shopColNames.has('reminder24h')) {
      await prisma.$executeRawUnsafe('ALTER TABLE "Barbershop" ADD COLUMN "reminder24h" BOOLEAN DEFAULT 1').catch(() => {});
    }
    if (!shopColNames.has('reminder6h')) {
      await prisma.$executeRawUnsafe('ALTER TABLE "Barbershop" ADD COLUMN "reminder6h" BOOLEAN DEFAULT 1').catch(() => {});
    }
    if (!shopColNames.has('reminder2h')) {
      await prisma.$executeRawUnsafe('ALTER TABLE "Barbershop" ADD COLUMN "reminder2h" BOOLEAN DEFAULT 1').catch(() => {});
    }
    if (!shopColNames.has('reminder1h')) {
      await prisma.$executeRawUnsafe('ALTER TABLE "Barbershop" ADD COLUMN "reminder1h" BOOLEAN DEFAULT 1').catch(() => {});
    }
    if (!shopColNames.has('whatsappApiKey')) {
      await prisma.$executeRawUnsafe('ALTER TABLE "Barbershop" ADD COLUMN "whatsappApiKey" TEXT').catch(() => {});
    }
    if (!shopColNames.has('whatsappPhoneId')) {
      await prisma.$executeRawUnsafe('ALTER TABLE "Barbershop" ADD COLUMN "whatsappPhoneId" TEXT').catch(() => {});
    }

    // 2. Check Customer columns
    const customerCols = await prisma.$queryRawUnsafe<Array<{ name: string }>>('PRAGMA table_info("Customer")').catch(() => []);
    const customerColNames = new Set(customerCols.map(c => c.name));
    if (!customerColNames.has('whatsappPhone')) {
      await prisma.$executeRawUnsafe('ALTER TABLE "Customer" ADD COLUMN "whatsappPhone" TEXT').catch(() => {});
    }
    if (!customerColNames.has('marketingOptIn')) {
      await prisma.$executeRawUnsafe('ALTER TABLE "Customer" ADD COLUMN "marketingOptIn" BOOLEAN DEFAULT 1').catch(() => {});
    }

    // 3. Check Appointment columns
    const appointmentCols = await prisma.$queryRawUnsafe<Array<{ name: string }>>('PRAGMA table_info("Appointment")').catch(() => []);
    const apptColNames = new Set(appointmentCols.map(c => c.name));
    if (!apptColNames.has('origin')) {
      await prisma.$executeRawUnsafe('ALTER TABLE "Appointment" ADD COLUMN "origin" TEXT DEFAULT \'WEB\'').catch(() => {});
    }
    if (!apptColNames.has('rescheduledFromId')) {
      await prisma.$executeRawUnsafe('ALTER TABLE "Appointment" ADD COLUMN "rescheduledFromId" TEXT').catch(() => {});
    }

    // 4. Create missing tables if needed
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "WhatsappSession" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "barbershopId" TEXT NOT NULL,
        "phone" TEXT NOT NULL,
        "state" TEXT NOT NULL DEFAULT 'IDLE',
        "metadata" TEXT,
        "lastActivity" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "WhatsappSession_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `).catch(() => {});

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "WhatsappMessage" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "barbershopId" TEXT NOT NULL,
        "customerId" TEXT,
        "phone" TEXT NOT NULL,
        "direction" TEXT NOT NULL,
        "type" TEXT NOT NULL DEFAULT 'TEXT',
        "content" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'SENT',
        "providerMessageId" TEXT,
        "appointmentId" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "WhatsappMessage_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `).catch(() => {});

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AppointmentReminder" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "appointmentId" TEXT NOT NULL,
        "reminderType" TEXT NOT NULL,
        "scheduledFor" DATETIME NOT NULL,
        "sentAt" DATETIME,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "error" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AppointmentReminder_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `).catch(() => {});

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "EducationProgress" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "barbershopId" TEXT NOT NULL,
        "contentId" TEXT NOT NULL,
        "isCompleted" BOOLEAN NOT NULL DEFAULT 1,
        "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "EducationProgress_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "EducationProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `).catch(() => {});

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "EducationFavorite" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "barbershopId" TEXT NOT NULL,
        "contentId" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "EducationFavorite_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "EducationFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `).catch(() => {});

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "EducationAiConsultation" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "barbershopId" TEXT NOT NULL,
        "question" TEXT NOT NULL,
        "topic" TEXT,
        "diagnosis" TEXT,
        "recommendation" TEXT,
        "actionPlanJson" TEXT,
        "metric" TEXT,
        "disclaimer" TEXT,
        "responseTimeMs" INTEGER,
        "modelUsed" TEXT NOT NULL DEFAULT 'DETERMINISTIC_RULES_ENGINE',
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "EducationAiConsultation_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "EducationAiConsultation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )
    `).catch(() => {});

    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "WhatsappSession_barbershopId_phone_key" ON "WhatsappSession"("barbershopId", "phone")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "AppointmentReminder_appointmentId_reminderType_key" ON "AppointmentReminder"("appointmentId", "reminderType")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "EducationProgress_userId_contentId_key" ON "EducationProgress"("userId", "contentId")`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "EducationFavorite_userId_contentId_key" ON "EducationFavorite"("userId", "contentId")`).catch(() => {});
  } catch (err) {
    console.warn('[DB AutoSync] Warning during schema sync:', err);
  }
}

// Auto-run on server import
ensureDatabaseSchema().catch(() => {});
