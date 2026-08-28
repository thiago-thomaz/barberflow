# Relatório de Auditoria de Infraestrutura — WAHA + n8n + BarberFlow

**Data da Auditoria:** 28 de Agosto de 2026  
**Fase:** FASE 0 — Auditoria Pré-Instalação  
**Status:** CONCLUÍDA SEM ALTERAÇÕES DESTRUCTIVAS  

---

## 1. 🌐 DNS e Domínios

| Domínio | IP / Destino | Status DNS | Uso |
| :--- | :--- | :--- | :--- |
| **`evo.projetosunion.cloud`** | `72.62.13.62` | ✅ **Apontado & Resolvendo** | Destinado ao **WAHA (WhatsApp HTTP API)** |
| **`barber.projetosunion.cloud`** | `72.62.13.62` | ✅ **Ativo (HTTPS / Traefik)** | **BarberFlow** (SaaS Multi-tenant / APIs) |
| **`n8n.srv1194775.hstgr.cloud`** | Hostinger Cloud | ✅ **Ativo & Saudável** | **n8n Workflow Engine** (API v1 ativa) |

---

## 2. 🖥️ VPS & Recursos do Servidor

- **IP da VPS:** `72.62.13.62`
- **Reverse Proxy:** Traefik (Gerenciado nativamente pelo Coolify com emissão automática de certificados Let's Encrypt SSL/TLS).
- **Portas Públicas:** 80 (HTTP ➔ Redirecionamento 301) e 443 (HTTPS Seguro).
- **Isolamento:** Containers Docker independentes em rede gerenciada (`coolify`).

---

## 3. ⚙️ Instância n8n

- **Endpoint API:** `https://n8n.srv1194775.hstgr.cloud/api/v1`
- **Health Check:** `status: ok` (latência ~851ms)
- **Workflows Identificados:** 41 workflows cadastrados na instância (incluindo pipelines de afiliados, trading quantitativo e monitoramento).
- **Workflow Dedicado do BarberFlow:** `[BARBERFLOW] - Central de Notificações & Automações WhatsApp` (ID: `qvThqBY5e83PmsWS`).
- **Garantia de Isolamento:** O novo fluxo `BARBERFLOW — WHATSAPP INBOUND` e `BARBERFLOW — WHATSAPP REMINDERS` será criado de forma independente, **sem alterar nem tocar em nenhum dos outros 40 fluxos existentes**.

---

## 4. 💈 BarberFlow Application

- **Versão:** 1.0.0 (Next.js 14.2.35 App Router)
- **Banco de Dados:** SQLite (`dev.db`) com migrações Prisma sincronizadas e volume persistente.
- **Health Check:** `https://barber.projetosunion.cloud/api/health` ➔ `status: ok`, latência `74ms`.
- **Endpoints Prontos para WAHA:**
  - `POST /api/webhooks/whatsapp` (Recepção de mensagens e motor FSM)
  - `GET /api/public/whatsapp/availability` (Consulta de horários oficiais)
  - `POST /api/public/whatsapp/appointments` (Criação anti-conflito)
  - `GET /api/calendar/appointment/[token].ics` (Calendário RFC 5545)
  - `GET /api/internal/reminders/due` & `POST /api/internal/reminders/due` (Lembretes)

---

## 5. 📦 Plano de Implantação do WAHA (Sem Conflitos)

1. **Serviço no Coolify:**
   - **Nome da Aplicação:** `barberflow-waha`
   - **Imagem Oficial:** `devlikeapro/waha:latest` (ou tag estável `devlikeapro/waha:core`)
   - **FQDN / Domínio:** `https://evo.projetosunion.cloud`
   - **Porta Interna:** `3000`
2. **Persistência de Sessão WhatsApp:**
   - **Volume:** `waha_sessions:/app/.sessions`
   - Garante que a sessão QR Code permaneça conectada mesmo após reinicialização do container ou da VPS.
3. **Variáveis de Ambiente Recomendadas:**
   - `TZ`: `America/Sao_Paulo`
   - `WAHA_API_KEY`: Chave forte gerada criptograficamente
   - `WAHA_DASHBOARD_ENABLED`: `true`
   - `WAHA_DASHBOARD_USERNAME`: `admin`
   - `WAHA_DASHBOARD_PASSWORD`: Senha forte gerada
   - `WHATSAPP_HOOK_URL`: `https://n8n.srv1194775.hstgr.cloud/webhook/barberflow-waha-inbound`
   - `WHATSAPP_HOOK_EVENTS`: `message,message.any,session.status`
4. **Engine Recomendada:**
   - `WEBJS` (ou `NOWEB` / `GOWS` conforme plano WAHA Core).

---

## 6. 🛡️ Riscos e Ações Preventivas

| Item | Risco Identificado | Ação Preventiva |
| :--- | :--- | :--- |
| **Outros Projetos no n8n** | Conflito de webhooks ou execução | Webhook path exclusivo `/webhook/barberflow-waha-inbound` |
| **Sessão WhatsApp** | Perda de login em reboot | Volume persistente `/app/.sessions` configurado |
| **Timezone** | Deslocamento de horários | `TZ=America/Sao_Paulo` forçado no container WAHA e BarberFlow |
| **Segurança API** | Acesso público desprotegido | `WAHA_API_KEY` obrigatório em todos os endpoints |
