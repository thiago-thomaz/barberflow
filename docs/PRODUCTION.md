# Guia de Prontidão para Produção (Production Readiness) — BarberFlow

Este documento descreve os requisitos, configurações e rotinas para execução segura e estável do **BarberFlow SaaS** em ambiente de produção 24/7.

---

## 1. Checklist de Infraestrutura

- [x] **Node.js**: $\ge 20.x$ LTS ou contêiner Docker oficial `node:20-alpine`.
- [x] **Banco de Dados**: PostgreSQL 14+ com pool de conexões otimizado (`pgbouncer` opcional para escala).
- [x] **HTTPS**: Obrigatório via Let's Encrypt / Certbot / Cloudflare ou reverse proxy Caddy / Traefik / Nginx.
- [x] **Cookies Seguros**: Flag `secure: true`, `httpOnly: true`, `sameSite: 'lax'`.
- [x] **Health Check**: Endpoint `/api/health` para monitoramento de uptime de contêineres e banco.
- [x] **Rate Limiting**: Ativo em endpoints de login, agendamento público e recuperação de senha.

---

## 2. Configuração de Variáveis de Ambiente em Produção

```env
# Banco de dados PostgreSQL
DATABASE_URL="postgresql://usuario:senha_forte@host_postgres:5432/barberflow_prod?schema=public&sslmode=prefer"

# Segredo JWT (Chave com pelo menos 32 caracteres gerada aleatoriamente)
JWT_SECRET="gere_uma_chave_longa_e_segura_de_32_bytes_exemplo_via_openssl"

# URL pública da aplicação
NEXT_PUBLIC_APP_URL="https://app.barberflow.com.br"

# Ambiente
NODE_ENV="production"

# Webhooks e Gateways
PAYMENT_WEBHOOK_SECRET="whsec_chave_secreta_webhook_gateway"
```

---

## 3. Monitoramento & Healthcheck

- **URL de Verificação de Saúde**: `GET /api/health`
- **Resposta Esperada**:
```json
{
  "status": "ok",
  "timestamp": "2026-08-25T22:00:00.000Z",
  "version": "1.0.0",
  "database": "ok",
  "latencyMs": 8
}
```
- Em caso de falha do banco, retorna HTTP 503 com status `degraded` para que orquestradores (Kubernetes, Docker Swarm, Coolify) possam reiniciar ou alertar.
