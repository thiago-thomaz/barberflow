# 🔌 Referência de Endpoints de API — BarberFlow Admin (`/api/admin/*`)

Todos os endpoints abaixo exigem autenticação via cabeçalho `Authorization: Bearer <TOKEN>` de um usuário com privilégio `SUPER_ADMIN`.

---

## 1. `/api/admin/dashboard`
- **Método:** `GET`
- **Descrição:** Retorna visão executiva agregada do SaaS (MRR, ARR, contadores de tenants, taxas de crescimento, status de assinaturas e atividade recente).
- **Resposta:**
  ```json
  {
    "success": true,
    "data": {
      "financial": { "mrr": 89.9, "arr": 1078.8, "pastDueAmount": 0 },
      "tenants": { "total": 2, "active": 2, "inactive": 0, "growth": { "today": 0, "sevenDays": 2, "thirtyDays": 2 } },
      "subscriptions": { "active": 1, "trialing": 0, "pastDue": 0, "retentionRate": 100 }
    }
  }
  ```

---

## 2. `/api/admin/barbershops`
- **Método:** `GET`
- **Parâmetros de Consulta:** `status`, `search`, `page`, `limit`
- **Descrição:** Retorna listagem paginada de barbearias com dados de proprietário, plano, uso de recursos e status.

---

## 3. `/api/admin/barbershops/[id]`
- **Método:** `GET`
  - **Descrição:** Visão 360º de um tenant (cadastro, assinaturas, barbeiros, últimos agendamentos, clientes e histórico de auditoria).
- **Método:** `PATCH`
  - **Descrição:** Altera status de ativação (`isActive`), dados cadastrais ou plano da barbearia.
  - **Body:** `{ "isActive": false, "reason": "Motivo da suspensão" }`

---

## 4. `/api/admin/users` & `/api/admin/users/[id]`
- **Método:** `GET /api/admin/users` — Listagem paginada de usuários da plataforma.
- **Método:** `PATCH /api/admin/users/[id]` — Alteração de privilégios (`role`: `SUPER_ADMIN`, `OWNER`, `BARBER`, `RECEPTIONIST`).

---

## 5. `/api/admin/plans` & `/api/admin/plans/[id]`
- **Método:** `GET /api/admin/plans` — Lista todos os planos de assinatura.
- **Método:** `POST /api/admin/plans` — Cria novo plano de assinatura com limites de barbeiros e feature flags.
- **Método:** `PATCH /api/admin/plans/[id]` — Atualiza preços, limites e recursos de um plano.

---

## 6. `/api/admin/subscriptions` & `/api/admin/subscriptions/[id]`
- **Método:** `GET /api/admin/subscriptions` — Listagem paginada de assinaturas ativas, em teste, inadimplentes ou canceladas.
- **Método:** `PATCH /api/admin/subscriptions/[id]` — Ajuste manual de vigência ou status.

---

## 7. `/api/admin/payments`
- **Método:** `GET` — Ledger completo de transações e mensalidades recebidas.
- **Método:** `POST` — Registro de pagamento manual de assinatura (`PIX`, `CREDIT_CARD`, `BOLETO`, `MANUAL`).

---

## 8. `/api/admin/metrics`
- **Método:** `GET` — Apuração matemática em tempo real de MRR, ARR, ARPU, Churn Rate, Retention Rate, LTV e decomposição por plano.

---

## 9. `/api/admin/health`
- **Método:** `GET` — Healthcheck em tempo real do Next.js, SQLite, WAHA WhatsApp e n8n.

---

## 10. `/api/admin/audit`
- **Método:** `GET` — Consulta paginada aos registros imutáveis do `AdminAuditLog` com filtros por ação, admin e barbearia.

---

## 11. `/api/admin/config`
- **Método:** `GET` — Lista parâmetros globais do SaaS (`SaaSSetting`).
- **Método:** `PATCH` — Atualiza configurações e políticas operacionais com auditoria.
