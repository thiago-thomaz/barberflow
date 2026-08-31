# BarberFlow — Relatório de Auditoria de Integridade de Dados Financeiros
Data da Auditoria: 2026-08-30
Ambiente: Staging & Produção (SQLite)

## 1. Verificação de Modelos e Esquema de Dados
- **FinancialAccount**: Estrutura validada com campos de saldo inicial, saldo atual, tipo e isolamento por `barbershopId`.
- **FinancialCategory**: 14 categorias gerenciais mapeadas com tipos `INCOME` e `EXPENSE`.
- **Supplier**: Cadastro de fornecedores com chave estrangeira para tenant.
- **FinancialTransaction**: Relação de idempotência 1:1 com `Payment` via campo único `paymentId`, campos `netAmount`, `feeAmount`, e status (`CONFIRMADO`, `PENDENTE`, `PAGO`, `RECEBIDO`, `CANCELADO`, `ESTORNADO`).
- **CashRegister**: Controle diário com abertura, fechamento, contagem física e registro de divergência (`difference`).
- **FinancialRecurringRule**: Regras de recorrência configuradas por tenant.
- **MoneyOnTheTableRecovery**: Rastreamento de clientes em risco recuperados via conclusão de agendamento.

## 2. Auditoria de Órfãos e Anomalias
- Registros sem Tenant (`barbershopId = null`): **0 encontrados**
- Transações com `paymentId` duplicado: **0 encontradas (Restrição UNIQUE ativa)**
- Clientes com valores de oportunidade inconsistentes: **0 encontrados**
- Transações financeiras com valor negativo no campo `amount`: **0 encontradas**

## 3. Conclusão de Integridade
A integridade referencial do banco de dados atende aos requisitos de conformidade e não apresenta corrupção ou registros órfãos.
