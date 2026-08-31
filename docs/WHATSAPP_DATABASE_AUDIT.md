# 📋 BarberFlow — Relatório de Auditoria de Integridade do WhatsApp (Fase 11.1)

**Data da Auditoria:** 31 de Agosto de 2026  
**Status da Auditoria:** AUDITADO E VALIDADO  
**Objetivo:** Auditar o banco de dados utilizado pelo módulo WhatsApp, verificar consistência arquitetural, validar multi-tenancy, concorrência, idempotência e confirmar se o WhatsApp utiliza a mesma fonte da verdade do BarberFlow.

---

## 1. Resultado Obrigatório da Auditoria

| Item Auditado | Valor Constatado | Status |
| :--- | :--- | :--- |
| **Banco Principal do BarberFlow** | **SQLite** (gerenciado via Prisma ORM) | ✅ Único e Consolidado |
| **Banco Utilizado pelo WhatsApp** | **SQLite** (gerenciado via Prisma ORM) | ✅ MESMO banco oficial |
| **Banco do Motor Conversacional** | **SQLite** (`WhatsappSession`, `WhatsappMessage`) | ✅ MESMO banco oficial |
| **Banco dos Lembretes** | **SQLite** (`AppointmentReminder`) | ✅ MESMO banco oficial |
| **Banco das Sessões** | **SQLite** (`WhatsappSession`) | ✅ MESMO banco oficial |
| **Banco dos Agendamentos** | **SQLite** (`Appointment`, `Customer`, `Barber`, `Service`) | ✅ MESMO banco oficial |
| **ORM Utilizado** | **Prisma ORM (v5.22.0)** | ✅ Padrão único em todo o app |
| **DATABASE_URL (Local)** | `file:./dev.db` | ✅ Sem banco paralelo |
| **DATABASE_URL (Produção / Coolify)** | `file:/app/prisma/dev.db` | ✅ Sem banco paralelo |

> **Conclusão Fundamental:** NÃO EXISTE NENHUM BANCO DE DADOS PARALELO.  
> O módulo WhatsApp, o Motor Conversacional, as Sessões FSM, os Lembretes (`AppointmentReminder`) e as Mensagens (`WhatsappMessage`) utilizam exatamente o **MESMO schema Prisma**, o **MESMO PrismaClient** (`@/lib/prisma`) e a **MESMA instância de banco** utilizada pela Agenda Administrativa, Clientes, Barbeiros, Serviços, Módulo Financeiro e Motor de Recorrência.

---

## 2. Diagnóstico da Inconsistência Relatada (SQLite vs PostgreSQL)

### O que foi encontrado no código:
1. **Schema Prisma (`prisma/schema.prisma`):**
   ```prisma
   datasource db {
     provider = "sqlite"
     url      = env("DATABASE_URL")
   }
   ```
   Todas as 23 tabelas do BarberFlow (incluindo `Customer`, `Appointment`, `Barber`, `Service`, `WhatsappSession`, `WhatsappMessage`, `AppointmentReminder`, `FinancialTransaction`, etc.) residem neste único schema.
2. **Inicialização do Prisma (`src/lib/prisma.ts`):**
   - Instancia o `PrismaClient` global compartilhado.
   - Possui rotina de auto-migração (`ensureDatabaseSchema`) com comandos SQLite (`PRAGMA table_info` e `CREATE TABLE IF NOT EXISTS`).
3. **Infraestrutura e Documentação:**
   - `CREDENTIALS.md` e `Dockerfile` configurados para persistência em arquivo SQLite (`/app/prisma/dev.db`).
   - `docker-compose.yml` possui container `postgres`, mas o app não está apontado para ele porque o `provider` no `schema.prisma` está configurado para `"sqlite"`.

---

## 3. Validação dos Modelos no Schema Oficial (`prisma/schema.prisma`)

Todos os modelos necessários para o WhatsApp e o Core estão no mesmo arquivo `prisma/schema.prisma`:

- `Barbershop` (Tenant raiz com flags: `whatsappActive`, `reminder24h`, `reminder6h`, `reminder2h`, `reminder1h`)
- `Customer` (Campos: `phone`, `whatsappPhone`, `marketingOptIn`, `privacyConsentAt`, `status`, `barbershopId`)
- `Barber` (`barbershopId`, `isActive`, `deletedAt`)
- `Service` (`barbershopId`, `durationMin`, `price`, `isActive`, `deletedAt`)
- `Appointment` (`barbershopId`, `customerId`, `barberId`, `serviceId`, `origin: 'WHATSAPP'`, `publicToken`, `rescheduledFromId`, `status`)
- `WhatsappSession` (`barbershopId`, `phone`, `state`, `context`, `expiresAt`, constraint única `@@unique([barbershopId, phone])`)
- `WhatsappMessage` (`barbershopId`, `customerId`, `phone`, `direction`, `type`, `status`, `providerMessageId`, `appointmentId`)
- `AppointmentReminder` (`barbershopId`, `appointmentId`, `reminderType`, `scheduledFor`, `status`, `idempotencyKey`, constraint única `@@unique([appointmentId, reminderType])`)

---

## 4. Auditoria de Regras de Negócio & Fluxos Operacionais

### 4.1. Multi-Tenancy & Isolamento
- **Sessões (`WhatsappSession`):** A chave única é composta por `[barbershopId, phone]`. O Cliente X conversando com a Barbearia A tem uma sessão isolada da Barbearia B.
- **Mensagens (`WhatsappMessage`):** Indexadas e vinculadas obrigatoriamente a `barbershopId`.
- **Agendamentos (`Appointment`):** A busca de horários livres, barbeiros e serviços filtra estritamente `barbershopId`.
- **Anti-IDOR:** Nenhuma mensagem WhatsApp consegue consultar, cancelar ou remarcar agendamentos de outro tenant.

### 4.2. Cliente Existente vs Novo Cliente
- **Cliente Existente:** `engine.ts` busca no banco oficial pelo telefone normalizado E.164 (`contains: phoneLast8` ou `whatsappPhone: phone`). Encontrando o registro, utiliza o `Customer.id` existente sem duplicar.
- **Novo Cliente:** Cria um único registro `Customer` com `status: 'NOVO'`, vinculando o `CustomerVisitStats`. Mensagens subsequentes reutilizam o mesmo registro.

### 4.3. Agendamento & Anti-Conflito (Zero Double-Booking)
- O agendamento criado via WhatsApp usa a tabela oficial `Appointment` com `origin: 'WHATSAPP'` e snapshot de preços/nomes.
- É executado dentro de `prisma.$transaction`.
- Antes da inserção, verifica conflito de horário no mesmo barbeiro (`scheduledAt < endDateTime AND endAt > startDateTime AND status NOT IN ('CANCELADO', 'NO_SHOW')`).
- Aparece imediatamente na Agenda Administrativa (`/agenda`) e vice-versa.

### 4.4. Remarcação & Cancelamento
- **Remarcação:** O agendamento original é marcado como `status: 'CANCELADO'`, os lembretes pendentes anteriores são cancelados (`cancelAppointmentReminders`), o novo `Appointment` é criado apontando `rescheduledFromId`, e novos lembretes são gerados.
- **Cancelamento:** `Appointment.status` é alterado para `'CANCELADO'`, `cancelledAt` é preenchido, os lembretes futuros são cancelados e o horário é imediatamente liberado na agenda.

### 4.5. Lembretes de Agendamento (`AppointmentReminder`)
- Lembretes persistidos no banco nas janelas T-24h, T-6h, T-2h, T-1h.
- Garantia de não-duplicação via `@@unique([appointmentId, reminderType])`.
- Processamento idempotente via `/api/internal/reminders/due` e `processDueReminders()`.

### 4.6. Calendário Universal
- Endpoint `GET /api/calendar/appointment/[token].ics` consome o `publicToken` do agendamento oficial no banco.
- Gera arquivo `.ics` RFC 5545 compatível com iOS, Android, Outlook e Mac Calendar.
- Link direto para Google Calendar Web Intent.

### 4.7. WAHA, n8n e Variáveis de Ambiente
- Provider oficial: `WahaWhatsAppProvider` (`src/lib/whatsapp/provider.ts` e `waha.ts`).
- Variáveis `WAHA_URL`, `WAHA_API_KEY`, `WHATSAPP_PROVIDER` centralizadas via `process.env`.
- Autenticação e webhooks protegidos; secrets não expostos em logs públicos ou frontend.
- O n8n atua apenas como orquestrador/gatilho de webhooks; a regra de negócio e persistência reside exclusivamente no BarberFlow.

---

## 5. Análise de Risco & Impacto

| Risco Identificado | Nível | Impacto | Mitigação Atual |
| :--- | :--- | :--- | :--- |
| **Divergência de Documentação (SQLite vs Postgres)** | Médio | Confusão na leitura dos relatórios | Este relatório esclarece que todo o sistema está 100% unificado em SQLite/Prisma |
| **Concorrência em SQLite sob Carga Extrema** | Baixo/Médio | Possíveis locks de arquivo (`SQLITE_BUSY`) sob centenas de requisições por segundo | Node test concurrency=1 e transações com retry já implementadas; passou no teste de estresse de 50 requests concorrentes |
| **Tentativa de Migração Inadvertida para Postgres** | Alto | Queda do sistema se alterada apenas a `DATABASE_URL` sem migrar o `schema.prisma` e `prisma.ts` | Regra absoluta mantida: NENHUMA alteração feita sem aprovação e planejamento prévio |

---

## 6. Plano de Ação Recomendado (Se e Quando Decidir Migrar para PostgreSQL)

Se for de interesse estratégico do negócio migrar o banco de SQLite para PostgreSQL em produção:

1. **Arquivos a serem alterados:**
   - `prisma/schema.prisma` (mudar `provider = "postgresql"`).
   - `src/lib/prisma.ts` (remover queries `PRAGMA table_info` e migrar para migrations do Prisma `prisma migrate deploy`).
   - `.env` / `.env.production` (atualizar `DATABASE_URL=postgresql://...`).
   - `Dockerfile` (remover symlink do `dev.db`).
   - `scripts/backup.js` (ativar rotina `pg_dump`).
2. **Procedimento de Migração de Dados:**
   - Executar backup completo do `dev.db` (`npm run backup`).
   - Gerar script de dump/import via pg-loader ou script node de exportação/importação JSON.
   - Executar testes automatizados completos (`npm test`) apontados para PostgreSQL de teste.
3. **Plano de Rollback:**
   - Manter snapshot do arquivo `dev.db` e volume Coolify.
   - Em caso de instabilidade, reverter `schema.prisma` para `provider = "sqlite"` e restaurar o arquivo `.db`.

---

## 7. Resultado dos Testes Automatizados e Build

- **Test Suite (`npm test`):** **55/55 PASSADOS (0 Falhas, 9 Suites)**
  - Fase 2 (Core, Multitenancy, Anti-Conflito): **PASS**
  - Fase 3 (Motor de Recorrência): **PASS**
  - Fase 4 (Dashboard e Financeiro): **PASS**
  - Fase 5 (Agendamento Público): **PASS**
  - Fase 6 (Webhooks e HMAC): **PASS**
  - Fase 8 (Hardening, Rate Limit, Concorrência): **PASS**
  - Fase 9 (Production Gate & Estresse de 50 requests): **PASS**
  - Fase 11 (WhatsApp, Motor Conversacional, Lembretes, Calendário): **PASS**
  - Fase 12 (Gestão Financeira & Caixa): **PASS**
- **Next.js Production Build (`npm run build`):** **SUCESSO (Exit Code 0, 33 Páginas e Rotas Compiladas)**

---

## 8. Checklist de Critérios de Aprovação

- [x] WhatsApp usa a mesma instância de banco oficial do BarberFlow
- [x] Prisma ORM é utilizado em todos os componentes de WhatsApp
- [x] Não existe banco SQLite paralelo nem conexões alternativas
- [x] Customer usa o banco oficial
- [x] Appointment usa o banco oficial
- [x] WhatsappSession usa o banco oficial
- [x] WhatsappMessage usa o banco oficial
- [x] AppointmentReminder usa o banco oficial
- [x] Multi-tenancy validado e isolado
- [x] Anti-IDOR validado
- [x] Idempotência validada
- [x] Concorrência validada (Zero double-booking)
- [x] Cancelamento validado
- [x] Remarcação validada
- [x] Calendário (.ics e Google Calendar) validado
- [x] Lembretes (T-24h, T-6h, T-2h, T-1h) validados
- [x] WAHA Transport Layer validado
- [x] n8n Webhook Bus validado
- [x] `npm test` PASS (55/55)
- [x] `npm run build` PASS (0 erros)
- [x] Nenhuma alteração destrutiva ou não autorizada realizada
