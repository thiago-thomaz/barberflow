# 🏛️ Arquitetura do SaaS BarberFlow Admin (Fase 20)

## 1. Visão Geral

O **BarberFlow Admin** (`/admin`) é a central de comando global do operador do SaaS. Ele opera em uma camada hierarquicamente superior aos painéis das barbearias individuais (`/dashboard`, `/agenda`, `/clientes`, `/financeiro`, `/academia`), permitindo administrar os tenants, planos, assinaturas, pagamentos, métricas executivas, usuários, suporte e saúde da infraestrutura.

---

## 2. Diagrama de Domínios & Isolamento

```
                               ┌──────────────────────────────────────────────┐
                               │             SUPER_ADMIN (Operador)           │
                               └──────────────────────┬───────────────────────┘
                                                      │ Acessa /admin
                                                      ▼
                       ┌──────────────────────────────────────────────────────────────┐
                       │               BARBERFLOW SAAS ADMIN CONSOLE                  │
                       │           (Plataforma, Planos, Assinaturas, Ledger)          │
                       └──────────────┬───────────────────────────────┬───────────────┘
                                      │                               │
                 ┌────────────────────┴──────────────┐   ┌────────────┴──────────────────┐
                 │                                   │   │                               │
                 ▼                                   ▼   ▼                               ▼
   ┌───────────────────────────┐       ┌───────────────────────────┐       ┌───────────────────────────┐
   │    TENANT A (Barbearia)   │       │    TENANT B (Barbearia)   │       │    TENANT N (Barbearia)   │
   │  - Dono (OWNER)           │       │  - Dono (OWNER)           │       │  - Dono (OWNER)           │
   │  - Barbeiros (BARBER)     │       │  - Barbeiros (BARBER)     │       │  - Barbeiros (BARBER)     │
   │  - Clientes / Agenda      │       │  - Clientes / Agenda      │       │  - Clientes / Agenda      │
   │  - Financeiro Local       │       │  - Financeiro Local       │       │  - Financeiro Local       │
   └───────────────────────────┘       └───────────────────────────┘       └───────────────────────────┘
```

---

## 3. Modelo de Autorização

| Role | Escopo de Acesso | Acesso ao `/admin` | Acesso ao `/dashboard` do Tenant |
| :--- | :--- | :---: | :---: |
| `SUPER_ADMIN` | Global (Todo o SaaS) | ✅ Sim | ✅ Sim (Suporte/Supervisão) |
| `OWNER` | Tenant Próprio | ❌ **Bloqueado (403)** | ✅ Sim |
| `BARBER` | Tenant Próprio (Operação) | ❌ **Bloqueado (403)** | ✅ Sim (Limitado) |
| `RECEPTIONIST` | Tenant Próprio (Atendimento)| ❌ **Bloqueado (403)** | ✅ Sim (Limitado) |

---

## 4. Componentes Chave

- **`src/lib/auth.ts`**: Validação de sessão no servidor via `requireSuperAdmin(req)` e registro de auditoria via `logAdminAuditEvent(...)`.
- **`src/lib/prisma.ts`**: Inicialização resiliente das tabelas `AdminAuditLog`, `SaaSPayment` e `SaaSSetting` em runtime no SQLite.
- **`src/components/Admin/`**:
  - `AdminShell.tsx`: Wrapper autenticado com navegação lateral e proteção de rota.
  - `AdminHeader.tsx`: Header superior executivo com monitor de status.
  - `AdminSidebar.tsx`: Menu lateral categorizado em 3 grupos de módulos.
  - `AdminStatCard.tsx`: Exibição visual de KPIs e unit economics.
  - `AdminDataTable.tsx`: Tabela rica de alta performance com paginação e busca.
  - `AdminConfirmModal.tsx`: Confirmação com justificativa obrigatória para ações destrutivas.
