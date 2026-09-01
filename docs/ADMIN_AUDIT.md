# 📜 Sistema de Auditoria Global — AdminAuditLog (Fase 20)

## 1. Objetivo

Garantir total rastreabilidade, imutabilidade e conformidade para todas as ações de impacto executadas por operadores do SaaS BarberFlow.

---

## 2. Estrutura do Modelo de Dados (`prisma/schema.prisma`)

```prisma
model AdminAuditLog {
  id          String   @id @default(cuid())
  adminUserId String
  action      String   // LOGIN, SUSPEND_TENANT, REACTIVATE_TENANT, CHANGE_PLAN, UPDATE_USER, RECORD_PAYMENT, CONFIG_UPDATE
  entity      String   // Barbershop, User, Plan, Subscription, SaaSPayment, SaaSSetting
  entityId    String?
  tenantId    String?
  metadata    String?  // JSON sanitizado (sem senhas ou tokens)
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())

  adminUser   User        @relation(fields: [adminUserId], references: [id], onDelete: Cascade)
  tenant      Barbershop? @relation(fields: [tenantId], references: [id], onDelete: SetNull)

  @@index([adminUserId])
  @@index([tenantId])
  @@index([action])
  @@index([createdAt])
}
```

---

## 3. Catálogo de Ações Auditadas

| Ação | Disparador | Metadados Gravados |
| :--- | :--- | :--- |
| `LOGIN` | Super Admin autentica no sistema | IP, User-Agent, e-mail |
| `SUSPEND_TENANT` | Suspensão da barbearia | Motivo (`reason`), `barbershopId`, estado anterior |
| `REACTIVATE_TENANT` | Reativação da barbearia | Motivo (`reason`), `barbershopId` |
| `CHANGE_PLAN` | Troca de plano ou status de assinatura | `oldPlanId`, `newPlanId`, `subscriptionStatus` |
| `UPDATE_USER` | Alteração de privilégios (`role`) | `targetUserId`, `oldRole`, `newRole`, `reason` |
| `CREATE_PLAN` | Cadastro de novo pacote SaaS | Nome, preço, limites de barbeiros |
| `RECORD_PAYMENT` | Liquidação manual no ledger | Valor (R$), método, código de referência |
| `CONFIG_UPDATE` | Alteração de parâmetros globais | Chaves atualizadas, justificativa |
