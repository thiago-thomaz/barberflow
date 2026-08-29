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
    const queries = [
      `ALTER TABLE "Barbershop" ADD COLUMN "whatsappActive" BOOLEAN DEFAULT 1`,
      `ALTER TABLE "Barbershop" ADD COLUMN "reminder24h" BOOLEAN DEFAULT 1`,
      `ALTER TABLE "Barbershop" ADD COLUMN "reminder6h" BOOLEAN DEFAULT 1`,
      `ALTER TABLE "Barbershop" ADD COLUMN "reminder2h" BOOLEAN DEFAULT 1`,
      `ALTER TABLE "Barbershop" ADD COLUMN "reminder1h" BOOLEAN DEFAULT 1`,
      `ALTER TABLE "Barbershop" ADD COLUMN "whatsappApiKey" TEXT`,
      `ALTER TABLE "Barbershop" ADD COLUMN "whatsappPhoneId" TEXT`,
      `ALTER TABLE "Customer" ADD COLUMN "whatsappPhone" TEXT`,
      `ALTER TABLE "Customer" ADD COLUMN "marketingOptIn" BOOLEAN DEFAULT 1`,
      `ALTER TABLE "Appointment" ADD COLUMN "origin" TEXT DEFAULT 'WEB'`,
      `ALTER TABLE "Appointment" ADD COLUMN "rescheduledFromId" TEXT`,
      `CREATE TABLE IF NOT EXISTS "WhatsappSession" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "barbershopId" TEXT NOT NULL,
        "phone" TEXT NOT NULL,
        "state" TEXT NOT NULL DEFAULT 'IDLE',
        "metadata" TEXT,
        "lastActivity" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "WhatsappSession_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS "WhatsappMessage" (
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
      )`,
      `CREATE TABLE IF NOT EXISTS "AppointmentReminder" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "appointmentId" TEXT NOT NULL,
        "reminderType" TEXT NOT NULL,
        "scheduledFor" DATETIME NOT NULL,
        "sentAt" DATETIME,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "error" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "AppointmentReminder_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "WhatsappSession_barbershopId_phone_key" ON "WhatsappSession"("barbershopId", "phone")`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "AppointmentReminder_appointmentId_reminderType_key" ON "AppointmentReminder"("appointmentId", "reminderType")`,
    ];

    for (const sql of queries) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch (e: any) {
        // Ignora erros de coluna/tabela já existente
      }
    }
  } catch (err) {
    console.warn('[DB AutoSync] Warning during schema sync:', err);
  }
}

// Auto-run on server import
ensureDatabaseSchema().catch(() => {});
