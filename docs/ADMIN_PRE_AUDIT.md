# 🛡️ BARBERFLOW ADMIN — PRÉ-AUDITORIA ARQUITETURAL (FASE 20)

**Data:** 01/09/2026  
**Status:** CONCLUÍDA — PRONTO PARA IMPLEMENTAÇÃO  
**Contexto:** Central de Controle do SaaS BarberFlow (`/admin`)

---

## 1. Arquitetura Atual
- **Framework Principal:** Next.js 14.2.18 (App Router, Server Components + Client Components).
- **Linguagem & Tipagem:** TypeScript 5.6.3 / Node.js 20+.
- **Banco de Dados & ORM:** Prisma ORM 5.22.0 sobre SQLite (`DATABASE_URL="file:./dev.db"` local e `file:/app/prisma/dev.db` no container de produção Docker).
- **Estilização & UI:** TailwindCSS 3.4.15, Lucide React 0.460.0, paleta dark mode premium (`#0D0F12`, `#14171F`, `#C69234`/`#F59E0B`).
- **Autenticação & Criptografia:** JWT assinado (`jsonwebtoken`), senhas com salt bcrypt (`bcryptjs`), cookies `HttpOnly` com SameSite `lax`.
- **Integrações Existentes:** WAHA (WhatsApp HTTP API Engine v2024), n8n Webhook bus HMAC-SHA256, Replicate (SD Inpainting).
- **Deploy & Infraestrutura:** Dockerfile multi-stage com Next.js Standalone, Coolify VPS Ubuntu 24.04 (`72.62.13.62`), Traefik proxy reverso com SSL Let's Encrypt em `https://barber.projetosunion.cloud`.

---

## 2. Entidades Existentes no Banco
- **Core SaaS:**
  - `User`: Administradores do SaaS, donos de barbearia, barbeiros, recepcionistas.
  - `PasswordResetToken`: Tokens criptográficos de recuperação de senha (TTL 1h, uso único).
  - `Barbershop`: O tenant (barbearia), com slug único, dados de contato, configurações de WhatsApp e flag `isActive`.
- **Operacional Barbearia:**
  - `Barber`: Profissionais da barbearia com comissão e avatar.
  - `Service`: Serviços prestados com duração e preço.
  - `BusinessHours`: Horários de funcionamento semanais.
  - `Customer` & `CustomerVisitStats`: Clientes finais com métricas de visita (mediana, ticket médio, recorrência).
  - `Appointment` & `Payment`: Agendamentos e pagamentos dos clientes nas barbearias.
- **Monetização & Planos:**
  - `Plan`: Planos do SaaS (`STARTER`, `PRO`, `BUSINESS`) com limites de barbeiros, limites de agendamentos e feature flags.
  - `Subscription`: Assinatura do tenant vinculada ao plano, status (`TRIALING`, `ACTIVE`, `PAST_DUE`, `CANCELLED`, `EXPIRED`), período e flags de renovação.
  - `SubscriptionEvent`: Eventos de assinatura (invoices, trials).
- **Eventos & Notificações:**
  - `Notification`, `Webhook`, `AutomationEvent`.
  - `AuditLog`: Log de auditoria dos tenants (`tenantId`, `userId`, `action`, `entity`, `metadata`).
- **WhatsApp Engine:**
  - `WhatsappSession`, `WhatsappMessage`, `AppointmentReminder`.
- **Gestão Financeira Barbearia:**
  - `FinancialAccount`, `FinancialCategory`, `Supplier`, `FinancialTransaction`, `CashRegister`, `FinancialRecurringRule`, `MoneyOnTheTableRecovery`.
- **Educação & Visagismo:**
  - `EducationProgress`, `EducationFavorite`, `EducationAiConsultation`, `AcademyDiagnostic`, `AcademyActionPlan`, `AcademyDiagnosticSnapshot`.
  - `VisagismSession`, `VisagismProfile`, `VisagismRecommendation`, `VisagismMetric`.

---

## 3. Sistema de Autenticação Existente
- **Mecanismo:** Token JWT (`signToken`, `verifyToken`) contendo payload:
  ```json
  {
    "userId": "string",
    "email": "string",
    "role": "SUPER_ADMIN | OWNER | BARBER | RECEPTIONIST",
    "barbershopId": "string | null",
    "barbershopName": "string",
    "barbershopSlug": "string"
  }
  ```
- **Armazenamento:** Cookie `barberflow_token` (HttpOnly, Secure em produção, MaxAge 7 dias) e suporte a header `Authorization: Bearer <token>`.
- **Funções Utilitárias:** `getSession()`, `getSessionFromRequest(req)`.

---

## 4. Sistema Atual de Autorização
- Atualmente, `requireAuth(req)` em `src/lib/auth.ts` valida a presença de sessão e `session.barbershopId`.
- **Auditoria de Falha Prévia:** O endpoint `GET /api/admin/metrics` permitia temporariamente roles `OWNER` e `ADMIN`.
- **Nova Regra:** Implementar `requireSuperAdmin(req)` estrito, validando tanto o payload do token JWT quanto consultando o banco de dados (`User.role === 'SUPER_ADMIN'`), bloqueando categoricamente `OWNER`, `BARBER`, `RECEPTIONIST` e anônimos com HTTP 403 / 401.

---

## 5. Como Identificar o Tenant
- No contexto das barbearias (`/dashboard`, `/agenda`, etc.), o tenant é estritamente identificado por `session.barbershopId`.
- No contexto SaaS Admin (`/admin`), o operador possui visão global (`SUPER_ADMIN`). Operações direcionadas a um tenant específico utilizam `[id]` ou `[slug]`, validadas explicitamente como operações globais com auditoria.

---

## 6. Como Identificar o Usuário
- O ID do usuário logado é obtido de forma imutável via `session.userId` e verificado contra a tabela `User`.

---

## 7. Estrutura Financeira Existente
- **Financeiro da Barbearia (Tenant):** Completo com contas (`FinancialAccount`), categorias (`FinancialCategory`), caixa diário (`CashRegister`), transações (`FinancialTransaction`) e pagamentos de clientes (`Payment`).
- **Financeiro do SaaS (Plataforma):** Modelos `Plan` (preço, intervalo, recursos) e `Subscription` (preço por tenant, status de cobrança, período de vigência). Falta entidade para registrar histórico de faturamento/invoices diretos da plataforma.

---

## 8. Planos e Assinaturas Existentes
- **Planos Existentes:** Model `Plan` estruturado com tiers (`STARTER`, `PRO`, `BUSINESS`), campos de limites (`maxBarbers`, `maxMonthlyAppointments`) e flags (`hasWhatsappAutomation`, `hasAdvancedAnalytics`, `hasMultiUnit`, `featuresJson`).
- **Assinaturas Existentes:** Model `Subscription` com relacionamento 1:1 por `Barbershop`, suportando `TRIALING`, `ACTIVE`, `PAST_DUE`, `CANCELLED`, `EXPIRED`.

---

## 9. Estrutura de Pagamento do SaaS
- **Status:** Não há gateway de pagamento real integrado (ex: Stripe/Asaas/MercadoPago).
- **Arquitetura Abstrata:** Criar modelo `SaaSPayment` / `SubscriptionInvoice` e camada `PaymentProvider` para registrar pagamentos manuais, simulações e futuras integrações sem gerar cobranças reais neste momento.

---

## 10. Status da Conta / Tenant
- `Barbershop.isActive`: Booleano para suspensão/ativação operacional da barbearia.
- `Subscription.status`: Estado da assinatura financeira (`TRIALING`, `ACTIVE`, `PAST_DUE`, `CANCELLED`, `EXPIRED`).

---

## 11. Riscos Encontrados & Mitigações
1. **Risco de Acesso Indevido:** `OWNER` de barbearia tentar acessar rotas `/admin/*` ou `/api/admin/*`.  
   *Mitigação:* Middleware/Guards server-side com `requireSuperAdmin` e verificação no banco em cada mutação.
2. **Risco de Violação Multi-Tenancy:** Erro de escopo ao consultar dados de barbearias pelo admin.  
   *Mitigação:* Queries administrativas devem explicitar agregações de sistema ou filtros claros por `barbershopId`.
3. **Risco de Ação Destrutiva Acidental:** Suspender barbearia ou cancelar assinatura com um clique.  
   *Mitigação:* Modal com confirmação explícita de impacto e digitação de confirmação / motivo.
4. **Risco de Migração SQLite em Produção:** Alteração do `schema.prisma` causar erro caso banco remoto não receba push imediato.  
   *Mitigação:* Manter e expandir `ensureDatabaseSchema()` em `src/lib/prisma.ts` para criar novas tabelas (`AdminAuditLog`, `SaaSPayment`, etc.) com tolerância automática.

---

## 12. Componentes que Podem ser Reutilizados
- `src/components/UI/StatCard.tsx`
- `src/components/UI/Badge.tsx`
- `src/components/UI/Modal.tsx`
- Ícones Lucide (`lucide-react`)
- Design tokens Tailwind (`#0D0F12`, `#14171F`, `#C69234`, `#F59E0B`, etc.)

---

## 13. Componentes que Precisam ser Criados
- `src/components/Admin/AdminShell.tsx` (Layout mestre com proteção e estrutura própria)
- `src/components/Admin/AdminHeader.tsx` (Barra superior exclusiva com status do SaaS e perfil Super Admin)
- `src/components/Admin/AdminSidebar.tsx` (Menu lateral modular com as 12 seções administrativas)
- `src/components/Admin/AdminDataTable.tsx` (Tabela de alta performance com busca, filtros, paginação e ordenação)
- `src/components/Admin/AdminStatCard.tsx` (Cards de KPIs com badge de variação e link)
- `src/components/Admin/AdminConfirmModal.tsx` (Modal de confirmação com digitação para ações destrutivas)
- `src/components/Admin/ImpersonationBanner.tsx` (Aviso fixo de modo suporte administrativo)

---

## 14. Migrations / Modelos Necessários
- **`AdminAuditLog`**: Registro imutável de ações administrativas globais (`adminUserId`, `action`, `entity`, `entityId`, `tenantId`, `metadata`, `ip`, `userAgent`).
- **`SaaSPayment`**: Registro de pagamentos/faturamento de assinaturas do SaaS (`barbershopId`, `subscriptionId`, `amount`, `status`, `method`, `paidAt`, `dueDate`).
- **`SaaSSetting`**: Configurações globais do SaaS (`key`, `value`, `category`, `description`, `isEncrypted`).

---

## 15. APIs que Podem ser Reutilizadas
- `GET /api/auth/me` (validação de usuário logado)
- `POST /api/auth/login` (login)
- `POST /api/auth/logout` (logout)
- `GET /api/health` (latência e status básico do banco)

---

## 16. APIs Novas Necessárias
- `GET /api/admin/dashboard`
- `GET /api/admin/barbershops`
- `GET /api/admin/barbershops/[id]`
- `PATCH /api/admin/barbershops/[id]`
- `GET /api/admin/users`
- `PATCH /api/admin/users/[id]`
- `GET /api/admin/plans`
- `POST /api/admin/plans`
- `PATCH /api/admin/plans/[id]`
- `GET /api/admin/subscriptions`
- `PATCH /api/admin/subscriptions/[id]`
- `GET /api/admin/payments`
- `POST /api/admin/payments`
- `GET /api/admin/metrics` (fórmulas exatas de MRR, ARR, ARPU, Churn, Retenção, LTV)
- `GET /api/admin/health` (App, Database, WAHA WhatsApp, n8n, Storage, Erros)
- `GET /api/admin/audit`
- `GET /api/admin/support`
- `GET /api/admin/config` & `PATCH /api/admin/config`
