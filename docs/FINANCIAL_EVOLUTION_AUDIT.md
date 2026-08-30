# Relatório de Auditoria: Evolução Financeira + Inteligência de Receita
**BarberFlow SaaS — Versão: Production-Safe**  
**Data:** 30/08/2026  
**Status:** CHECKPOINT 0 — AUDITORIA COMPLETA (SOMENTE LEITURA / NENHUMA ALTERAÇÃO REALIZADA)

---

## 1. Visão Geral da Auditoria

O sistema BarberFlow foi auditado ponta a ponta para planejar a evolução do módulo de **Faturamento** e a criação do novo módulo de **Gestão Financeira**, além do aprimoramento do **Dinheiro na Mesa**, garantindo **ZERO QUEBRA** de funcionalidades existentes em produção.

---

## 2. Inventário e Mapeamento de Entidades

| Entidade / Módulo | Status | Ação Planejada | Detalhes / Regras |
| :--- | :--- | :--- | :--- |
| **Payment** | EXISTENTE | **REUTILIZAR** | Fonte de verdade de pagamentos de atendimentos. Cada Payment gerará/vinculará 1 transação de receita automática via `paymentId` idempotente. |
| **Appointment** | EXISTENTE | **REUTILIZAR** | Agendamentos continuam gerando atendimentos e disparando pagamentos no complete. Nenhum campo removido. |
| **Customer & CustomerVisitStats** | EXISTENTE | **REUTILIZAR** | Mantém cálculo de ciclos (`medianDaysBetween`), `avgTicket` e status ('NOVO', 'ATIVO', 'EM_RISCO', 'INATIVO', 'VIP'). |
| **Barber & Commission** | EXISTENTE | **REUTILIZAR** | Mantém cálculo de comissões por barbeiro (`commission: Float`). |
| **Financeiro (`/financeiro`)** | EXISTENTE | **ALTERAR (ROTA/MENU)** | Manter 100% das métricas e componentes de vendas/comissões/métodos e renomear no Sidebar para **"Faturamento"**. |
| **Sidebar (`src/components/Sidebar.tsx`)** | EXISTENTE | **ALTERAR** | Renomear "Financeiro" -> "Faturamento" e adicionar "Gestão Financeira" logo abaixo com ícone dedicado (`Landmark` / `WalletCards`). |
| **Recorrência & Dinheiro na Mesa** | EXISTENTE | **REUTILIZAR & EVOLUIR** | Adicionar ranking de prioridade determinístico (ALTA, MÉDIA, BAIXA) e rastreamento de Receita Recuperada (`recoveredAmount`). |
| **Multi-tenancy & Auth (`src/lib/auth.ts`, `src/lib/tenant.ts`)** | EXISTENTE | **REUTILIZAR** | Toda nova rota exigirá `barbershopId` derivado da sessão JWT e validação estrita anti-IDOR. |
| **Timezone (`America/Sao_Paulo`)** | EXISTENTE | **REUTILIZAR** | Padrão UTC-3 em todas as datas de vencimento, recebimento, abertura/fechamento de caixa. |

---

## 3. Novas Entidades Necessárias para Gestão Financeira

Para suportar **Contas a Pagar**, **Contas a Receber**, **Fluxo de Caixa**, **Caixa Diário**, **Contas/Carteiras**, **Categorias**, **Fornecedores** e **Recorrências Financeiras** sem duplicar `Payment`:

1. **FinancialAccount (Contas/Carteiras):**
   - `id`, `barbershopId`, `name` (ex: "Caixa Balcão", "Banco Itaú", "Conta Cora"), `type` ('CASH', 'BANK', 'DIGITAL'), `initialBalance`, `currentBalance`, `isActive`.
2. **FinancialCategory (Categorias de Receitas/Despesas):**
   - `id`, `barbershopId`, `name`, `type` ('INCOME', 'EXPENSE'), `color`, `isActive`.
3. **Supplier (Fornecedores):**
   - `id`, `barbershopId`, `name`, `document` (CPF/CNPJ), `phone`, `email`, `notes`, `isActive`.
4. **FinancialTransaction (Movimentações Financeiras / Entradas e Saídas):**
   - `id`, `barbershopId`, `description`, `type` ('INCOME', 'EXPENSE', 'TRANSFER'), `amount`, `netAmount`, `feeAmount`, `categoryId`, `accountId`, `toAccountId` (para transferências), `supplierId`, `customerId`, `appointmentId`, `paymentId` (UNIQUE - idempotência com Payment), `status` ('PENDENTE', 'CONFIRMADO', 'CANCELADO', 'ESTORNADO'), `dueDate`, `paidDate`, `paymentMethod`, `isRecurring`, `recurringRuleId`, `cashRegisterId`, `createdBy`, `notes`.
5. **CashRegister (Controle de Caixa Diário):**
   - `id`, `barbershopId`, `accountId`, `openedAt`, `closedAt`, `openedBy`, `closedBy`, `initialBalance`, `expectedBalance`, `actualBalance`, `difference`, `status` ('OPEN', 'CLOSED'), `notes`.
6. **FinancialRecurringRule (Contas Recorrentes):**
   - `id`, `barbershopId`, `description`, `type` ('EXPENSE', 'INCOME'), `amount`, `categoryId`, `accountId`, `supplierId`, `frequency` ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'YEARLY'), `startDate`, `endDate`, `occurrencesLimit`, `isActive`.
7. **MoneyOnTheTableRecovery (Rastreamento de Receita Recuperada):**
   - `id`, `barbershopId`, `customerId`, `opportunityDetectedAt`, `opportunityAmount`, `appointmentId`, `recoveredAmount`, `recoveredAt`.

---

## 4. Arquivos e Rotas a Serem Afetados

### Arquivos Existentes a Ajustar (Compatibilidade 100% Preservada)
- `src/components/Sidebar.tsx`: Atualização do label para "Faturamento" e adição do link "/gestao-financeira".
- `src/app/api/appointments/[id]/complete/route.ts`: Registrar/sincronizar transação financeira vinculada ao `paymentId` de forma idempotente.
- `src/lib/recurrence.ts`: Inclusão do cálculo de prioridade (ALTA/MÉDIA/BAIXA) e consolidação da receita recuperada.
- `src/app/recorrencia/page.tsx`: Exibição de prioridade e taxa de recuperação real.

### Novos Arquivos / Rotas a Serem Criados
- **Páginas Frontend (Visual Dark Mode Premium existente):**
  - `src/app/gestao-financeira/page.tsx` (Visão Geral / Cards de Saldo, A Receber, A Pagar, Entradas, Saídas, Resultado)
  - `src/app/gestao-financeira/receber/page.tsx` (Contas a Receber)
  - `src/app/gestao-financeira/pagar/page.tsx` (Contas a Pagar)
  - `src/app/gestao-financeira/fluxo-caixa/page.tsx` (Fluxo de Caixa Realizado vs Previsto)
  - `src/app/gestao-financeira/caixa/page.tsx` (Abertura, Movimentação e Fechamento de Caixa)
  - `src/app/gestao-financeira/relatorios/page.tsx` (Relatórios com exportação CSV)
  - `src/app/gestao-financeira/configuracoes/page.tsx` (Contas, Categorias e Fornecedores)
- **APIs Backend:**
  - `src/app/api/financial-management/summary/route.ts`
  - `src/app/api/financial-management/transactions/route.ts`
  - `src/app/api/financial-management/transactions/[id]/route.ts`
  - `src/app/api/financial-management/cash-register/route.ts`
  - `src/app/api/financial-management/accounts/route.ts`
  - `src/app/api/financial-management/categories/route.ts`
  - `src/app/api/financial-management/suppliers/route.ts`
  - `src/app/api/financial-management/reports/route.ts`

---

## 5. Análise de Riscos e Estratégias de Mitigação

| Risco Identificado | Impacto | Estratégia de Mitigação |
| :--- | :--- | :--- |
| **Duplicação de Receita com Payment** | Alto | Uso estrito de `paymentId` como chave de idempotência única na tabela de transações financeiras. Processamento duplicado é ignorado com `upsert` ou verificação atômica. |
| **Quebra de Relatórios de Faturamento** | Alto | O endpoint `/api/financial` e a página `/financeiro` continuam existindo e funcionando com o schema atual sem alterações destrutivas. |
| **Perda de Dados em Migrations** | Crítico | Realização de backup SQLite prévio via `npm run backup`. Nenhuma coluna ou tabela existente será excluída ou renomeada. |
| **Vazamento Cross-Tenant (Multi-tenancy)** | Crítico | Todos os modelos terão `barbershopId` obrigatório indexado e todas as rotas validarão `session.barbershopId` obrigatório. |
| **Divergência de Timezone** | Médio | Todas as operações de datas usarão `America/Sao_Paulo` padronizado em `src/lib/timezone.ts`. |

---

## 6. Estratégia de Rollback

1. **Backup Pré-Migration:** Execução de `node scripts/backup.js` gerando cópia completa do banco em `backups/`.
2. **Reversão Rápida:** Caso haja qualquer anomalia, o backup SQLite pode ser restaurado imediatamente via `node scripts/test-restore.js`.
3. **Isolamento Modular:** O novo módulo reside em namespaces separados (`/gestao-financeira` e `/api/financial-management`), permitindo desativação instantânea sem afetar as funcionalidades core.

---

## 7. Próximos Passos (Checkpoints)

- **CHECKPOINT 0 (ATUAL):** Auditoria concluída. Parar e aguardar autorização do usuário.
- **CHECKPOINT 1:** Arquitetura e modelagem formal (Prisma Schema incremental + Plano de migração seguro).
- **CHECKPOINT 2:** Implementação modular de backend e frontend.
- **CHECKPOINT 3:** Execução de testes automatizados e validação de não-duplicação/multi-tenancy.
- **CHECKPOINT 4:** Production Gate e validação final em produção.
