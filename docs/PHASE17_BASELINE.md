# BarberFlow — Phase 17 Baseline Register

## 1. Identificação do Ambiente e Versões
- **Data/Hora**: 2026-08-31T20:28:00Z
- **Commit Base**: `6b5c1a5` (*chore(scripts): add phase 16 deployment and production validation scripts*)
- **Branch**: `main` (Up to date with origin/main)
- **Node.js**: `v24.18.0` (Local) / `v20.20.2` (Production Container)
- **npm**: `11.16.0` (Local) / `10.8.2` (Production Container)
- **Next.js**: `14.2.35`
- **Prisma ORM**: `5.22.0`
- **Banco de Dados**: SQLite (`prisma/dev.db`) com isolamento multi-tenant
- **Produção**: Coolify / VPS Docker em `https://barber.projetosunion.cloud`
- **Container Ativo em Produção**: `988293a29802`

---

## 2. Status dos Testes Automatizados Baseline
- **Comando**: `npm test`
- **Total de Suites**: 10
- **Total de Testes**: 93
- **Testes Aprovados**: 93 (100%)
- **Testes Falhos / Cancelados / Pulados**: 0
- **Duração**: 94.45s

---

## 3. Status de Build de Produção
- **Comando**: `npm run build`
- **Resultado**: Exit Code 0 (Compilado com sucesso)
- **Total de Rotas Geradas**: 46 páginas estáticas e dinâmicas
- **TypeScript & Linting**: 100% OK

---

## 4. Status de Backup e Restore Baseline
- **Comando**: `npm run backup` e `npm run backup:test`
- **Arquivo de Backup**: `backups/backup-sqlite-2026-08-31T20-26-12-875Z.db`
- **Restore Test**: PASS (6 barbearias, 2 usuários, 75 clientes, 266 agendamentos validados)

---

## 5. Status de Produção (Smoke Check)
- **URL**: `https://barber.projetosunion.cloud`
- **Healthcheck `/api/health`**: HTTP 200 OK (database: 'ok', latency: 2ms)
- **Status Geral**: STABLE & AUDIT-READY
