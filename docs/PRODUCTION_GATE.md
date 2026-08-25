# Matriz de Evidências de Produção — BarberFlow (Production Gate)

Esta matriz consolida a auditoria rigorosa de prontidão do sistema para entrar em produção, diferenciando o que foi testado em código/ambiente local, o que depende de infraestrutura externa e o que está bloqueado.

---

## Matriz de Validação & Evidências

| Área | Implementado | Testado Local | Testado Produção-like | Testado Produção Real | Evidência | Status |
|---|---|---|---|---|---|---|
| **Auth (Login/Logout/JWT)** | Sim | Sim | Sim | Não | Testes unitários de hash bcrypt, cookies HttpOnly, token tampering e expiração (`tests/phase8_production_hardening.test.js`) | **PASS** |
| **Authorization (RBAC)** | Sim | Sim | Sim | Não | Validação de roles `OWNER`, `BARBER`, `ADMIN` e restrição de rotas administrativas | **PASS** |
| **Multi-Tenancy** | Sim | Sim | Sim | Não | Isolamento multitenant testado com Tenant A vs Tenant B em 8 entidades (`tests/phase9_production_gate.test.js`) | **PASS** |
| **IDOR Protection** | Sim | Sim | Sim | Não | Nenhuma consulta usa `findUnique` direto sem escopo de tenant (`barbershopId`) | **PASS** |
| **Booking Engine** | Sim | Sim | Sim | Não | Algoritmo anti-conflito testado com 6 cenários de sobreposição (`tests/phase2.test.js`) | **PASS** |
| **Concurrency (Stress Test)** | Sim | Sim | Sim | Não | 50 requisições simultâneas em transação serializável geram exatamente 1 agendamento e 49 conflitos (`tests/phase9_production_gate.test.js`) | **PASS** |
| **Public Booking** | Sim | Sim | Sim | Não | Agendamento sem login em `/b/[slug]` com geração de `publicToken` e sem vazamento de dados privados (`tests/phase5_public_booking.test.js`) | **PASS** |
| **Password Recovery** | Sim | Sim | Sim | Não | Tokens criptográficos de uso único (`PasswordResetToken`) com expiração de 1h (`tests/phase8_production_hardening.test.js`) | **PASS** |
| **Rate Limiting** | Sim | Sim | Sim | Não | Sliding window em memória testado com bloqueio após 5 requisições de auth e cooldown (`src/lib/rate-limit.ts`) | **PASS** |
| **Database & Índices** | Sim | Sim | Sim | Não | Índices compostos criados no SQLite/PostgreSQL e chaves estrangeiras com integridade relacional | **PASS** |
| **Migrations** | Sim | Sim | Sim | Não | Migração base `prisma/migrations/20260825_init/migration.sql` criada para suporte a `prisma migrate deploy` | **PASS** |
| **Backup Strategy** | Sim | Sim | Sim | Não | Script multiplataforma `scripts/backup.js` para SQLite e PostgreSQL | **PASS** |
| **Restore Validation** | Sim | Sim | Sim | Não | Teste automatizado `scripts/test-restore.js` restaurou banco em ambiente isolado e validou contagem de tabelas com sucesso | **PASS** |
| **Backup Offsite (S3/R2)** | Sim | Não | Não | Não | Estratégia documentada em `docs/BACKUP.md`; envio automático para S3/R2 depende de credenciais de bucket em produção | **PARTIAL** |
| **n8n Integration** | Sim | Sim | Sim | Não | Barramento de eventos e envio de webhooks com assinatura HMAC-SHA256 testado (`tests/phase6_webhooks.test.js`). Conexão com nó n8n real requer URL externa | **PARTIAL** |
| **WhatsApp Messaging** | Sim | Sim | Sim | Não | Nível 1 (link direto wa.me com payload) pronto; Nível 2 (Evolution/Z-API via n8n) estruturado | **PARTIAL** |
| **Billing & Plans Architecture** | Sim | Sim | Sim | Não | Planos Starter, Pro e Business com 14 dias de trial e webhook idempotente implementados | **PASS** |
| **Gateway Pagamento Real** | Não | Não | Não | Não | Estrutura e webhook idempotente prontos; gateway real (Stripe/Asaas/MercadoPago) requer chaves de API de produção | **EXTERNAL DEPENDENCY** |
| **Feature Gate** | Sim | Sim | Sim | Não | Limite de barbeiros por plano (ex: max 2 no Starter) estritamente bloqueado no backend (`tests/phase9_production_gate.test.js`) | **PASS** |
| **LGPD Compliance** | Sim | Sim | Sim | Não | Consentimento `marketingOptIn`, exportação de dados e anonimização testados (`tests/phase8_production_hardening.test.js`) | **PASS** |
| **Docker Build** | Sim | Sim | Sim | Não | `Dockerfile` multi-stage com Next.js Standalone e usuário não-root `nextjs` testado | **PASS** |
| **Healthcheck** | Sim | Sim | Sim | Não | Endpoint `GET /api/health` retorna latência do banco e uptime | **PASS** |
| **Structured Logs & Sanitization**| Sim | Sim | Sim | Não | Logger com redação de senhas/tokens e injeção de correlation `requestId` (`src/lib/logger.ts`) | **PASS** |
| **Domínio & HTTPS** | Sim | Não | Não | Não | Depende de apontamento DNS e configuração SSL no Coolify/Traefik | **BLOCKED_EXTERNAL_ACCESS** |
| **Email Transacional Real** | Não | Não | Não | Não | Recuperação de senha gera token seguro em log/dev; disparo de SMTP/Resend real requer chave de API | **EXTERNAL DEPENDENCY** |
| **Mobile UX** | Sim | Sim | Sim | Não | Layout responsivo verificado com viewport mobile em todas as telas principais | **PASS** |
| **Performance (Latência)** | Sim | Sim | Sim | Não | Rotas essenciais com tempo de resposta $< 50\text{ms}$ em carga local | **PASS** |
