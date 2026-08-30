const { runRemoteCommand } = require('./vps-exec');

async function main() {
  const ps = await runRemoteCommand(`docker ps | grep 7ho00 | awk '{print $NF}'`);
  const container = ps.stdout.trim().split('\n')[0];
  console.log('Target container:', container);

  const nodeScript = `
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const statements = [
    \`CREATE TABLE IF NOT EXISTS "FinancialAccount" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "barbershopId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "type" TEXT NOT NULL DEFAULT 'BANK_ACCOUNT',
      "initialBalance" REAL NOT NULL DEFAULT 0,
      "currentBalance" REAL NOT NULL DEFAULT 0,
      "color" TEXT,
      "isDefault" BOOLEAN NOT NULL DEFAULT 0,
      "isActive" BOOLEAN NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "FinancialAccount_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );\`,
    \`CREATE INDEX IF NOT EXISTS "FinancialAccount_barbershopId_idx" ON "FinancialAccount"("barbershopId");\`,

    \`CREATE TABLE IF NOT EXISTS "FinancialCategory" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "barbershopId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "type" TEXT NOT NULL DEFAULT 'EXPENSE',
      "color" TEXT,
      "isDefault" BOOLEAN NOT NULL DEFAULT 0,
      "isActive" BOOLEAN NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "FinancialCategory_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );\`,
    \`CREATE INDEX IF NOT EXISTS "FinancialCategory_barbershopId_type_idx" ON "FinancialCategory"("barbershopId", "type");\`,

    \`CREATE TABLE IF NOT EXISTS "Supplier" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "barbershopId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "document" TEXT,
      "phone" TEXT,
      "email" TEXT,
      "notes" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "Supplier_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );\`,
    \`CREATE INDEX IF NOT EXISTS "Supplier_barbershopId_idx" ON "Supplier"("barbershopId");\`,

    \`DROP TABLE IF EXISTS "FinancialTransaction";\`,
    \`CREATE TABLE "FinancialTransaction" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "barbershopId" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "amount" REAL NOT NULL,
      "feeAmount" REAL NOT NULL DEFAULT 0.0,
      "netAmount" REAL NOT NULL,
      "categoryId" TEXT,
      "accountId" TEXT,
      "toAccountId" TEXT,
      "supplierId" TEXT,
      "customerId" TEXT,
      "appointmentId" TEXT,
      "paymentId" TEXT,
      "status" TEXT NOT NULL DEFAULT 'CONFIRMADO',
      "dueDate" DATETIME,
      "paidDate" DATETIME,
      "paymentMethod" TEXT,
      "isRecurring" BOOLEAN NOT NULL DEFAULT 0,
      "recurringRuleId" TEXT,
      "cashRegisterId" TEXT,
      "createdBy" TEXT,
      "paidBy" TEXT,
      "cancelledBy" TEXT,
      "cancelledAt" DATETIME,
      "reversalReason" TEXT,
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "FinancialTransaction_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "FinancialTransaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinancialCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "FinancialTransaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "FinancialTransaction_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "FinancialAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "FinancialTransaction_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "FinancialTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "FinancialTransaction_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "FinancialTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "FinancialTransaction_recurringRuleId_fkey" FOREIGN KEY ("recurringRuleId") REFERENCES "FinancialRecurringRule" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "FinancialTransaction_cashRegisterId_fkey" FOREIGN KEY ("cashRegisterId") REFERENCES "CashRegister" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    );\`,
    \`CREATE UNIQUE INDEX IF NOT EXISTS "FinancialTransaction_paymentId_key" ON "FinancialTransaction"("paymentId");\`,
    \`CREATE INDEX IF NOT EXISTS "FinancialTransaction_barbershopId_idx" ON "FinancialTransaction"("barbershopId");\`,
    \`CREATE INDEX IF NOT EXISTS "FinancialTransaction_type_idx" ON "FinancialTransaction"("type");\`,
    \`CREATE INDEX IF NOT EXISTS "FinancialTransaction_status_idx" ON "FinancialTransaction"("status");\`,
    \`CREATE INDEX IF NOT EXISTS "FinancialTransaction_dueDate_idx" ON "FinancialTransaction"("dueDate");\`,
    \`CREATE INDEX IF NOT EXISTS "FinancialTransaction_paidDate_idx" ON "FinancialTransaction"("paidDate");\`,
    \`CREATE INDEX IF NOT EXISTS "FinancialTransaction_categoryId_idx" ON "FinancialTransaction"("categoryId");\`,
    \`CREATE INDEX IF NOT EXISTS "FinancialTransaction_accountId_idx" ON "FinancialTransaction"("accountId");\`,
    \`CREATE INDEX IF NOT EXISTS "FinancialTransaction_barbershopId_type_status_idx" ON "FinancialTransaction"("barbershopId", "type", "status");\`,
    \`CREATE INDEX IF NOT EXISTS "FinancialTransaction_barbershopId_paidDate_idx" ON "FinancialTransaction"("barbershopId", "paidDate");\`,

    \`DROP TABLE IF EXISTS "CashRegister";\`,
    \`CREATE TABLE "CashRegister" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "barbershopId" TEXT NOT NULL,
      "accountId" TEXT NOT NULL,
      "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "closedAt" DATETIME,
      "openedBy" TEXT,
      "closedBy" TEXT,
      "initialBalance" REAL NOT NULL DEFAULT 0.0,
      "expectedBalance" REAL NOT NULL DEFAULT 0.0,
      "actualBalance" REAL,
      "difference" REAL,
      "status" TEXT NOT NULL DEFAULT 'OPEN',
      "notes" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "CashRegister_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "CashRegister_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );\`,
    \`CREATE INDEX IF NOT EXISTS "CashRegister_barbershopId_idx" ON "CashRegister"("barbershopId");\`,
    \`CREATE INDEX IF NOT EXISTS "CashRegister_status_idx" ON "CashRegister"("status");\`,
    \`CREATE INDEX IF NOT EXISTS "CashRegister_openedAt_idx" ON "CashRegister"("openedAt");\`,

    \`DROP TABLE IF EXISTS "MoneyOnTheTableRecovery";\`,
    \`CREATE TABLE "MoneyOnTheTableRecovery" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "barbershopId" TEXT NOT NULL,
      "customerId" TEXT NOT NULL,
      "opportunityDetectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "opportunityAmount" REAL NOT NULL DEFAULT 0.0,
      "priority" TEXT NOT NULL DEFAULT 'MEDIA',
      "appointmentId" TEXT,
      "recoveredAmount" REAL NOT NULL DEFAULT 0.0,
      "recoveredAt" DATETIME,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "MoneyOnTheTableRecovery_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "MoneyOnTheTableRecovery_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "MoneyOnTheTableRecovery_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    );\`,
    \`CREATE UNIQUE INDEX IF NOT EXISTS "MoneyOnTheTableRecovery_appointmentId_key" ON "MoneyOnTheTableRecovery"("appointmentId");\`,
    \`CREATE INDEX IF NOT EXISTS "MoneyOnTheTableRecovery_barbershopId_idx" ON "MoneyOnTheTableRecovery"("barbershopId");\`,
    \`CREATE INDEX IF NOT EXISTS "MoneyOnTheTableRecovery_customerId_idx" ON "MoneyOnTheTableRecovery"("customerId");\`,
    \`CREATE INDEX IF NOT EXISTS "MoneyOnTheTableRecovery_status_idx" ON "MoneyOnTheTableRecovery"("status");\`,
    \`CREATE INDEX IF NOT EXISTS "MoneyOnTheTableRecovery_priority_idx" ON "MoneyOnTheTableRecovery"("priority");\`,

    \`DROP TABLE IF EXISTS "FinancialRecurringRule";\`,
    \`CREATE TABLE "FinancialRecurringRule" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "barbershopId" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "amount" REAL NOT NULL,
      "type" TEXT NOT NULL DEFAULT 'EXPENSE',
      "categoryId" TEXT,
      "accountId" TEXT,
      "supplierId" TEXT,
      "frequency" TEXT NOT NULL DEFAULT 'MONTHLY',
      "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "endDate" DATETIME,
      "occurrencesLimit" INTEGER,
      "isActive" BOOLEAN NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "FinancialRecurringRule_barbershopId_fkey" FOREIGN KEY ("barbershopId") REFERENCES "Barbershop" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "FinancialRecurringRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FinancialCategory" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "FinancialRecurringRule_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "FinancialAccount" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
      CONSTRAINT "FinancialRecurringRule_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    );\`,
    \`CREATE INDEX IF NOT EXISTS "FinancialRecurringRule_barbershopId_idx" ON "FinancialRecurringRule"("barbershopId");\`,
    \`CREATE INDEX IF NOT EXISTS "FinancialRecurringRule_isActive_idx" ON "FinancialRecurringRule"("isActive");\`
  ];

  for (const sql of statements) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log('EXECUTED:', sql.split('\\n')[0]);
    } catch (e) {
      console.log('NOTICE:', sql.split('\\n')[0], '->', e.message);
    }
  }
  console.log('ALL FINANCIAL TABLES CREATED SUCCESSFULLY!');
}

run().catch(console.error);
`;

  await runRemoteCommand(`cat <<'EOF' > /tmp/migrate_financial.js\n${nodeScript}\nEOF`);
  await runRemoteCommand(`docker cp /tmp/migrate_financial.js ${container}:/app/migrate_financial.js`);
  const res = await runRemoteCommand(`docker exec ${container} node /app/migrate_financial.js`);
  console.log(res.stdout || res.stderr);
}

main().catch(console.error);
