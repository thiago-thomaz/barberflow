# BarberFlow — WAHA (WhatsApp HTTP API) Arquitetura & Guia de Produção

## 📌 1. Visão Geral do WAHA

O **WAHA (WhatsApp HTTP API)** é o motor de transporte responsável por conectar instâncias do WhatsApp Web à infraestrutura do BarberFlow e n8n.

- **Domínio de Produção:** `https://evo.projetosunion.cloud`
- **DNS:** Tipo `A` apontando para `72.62.13.62`
- **Porta Interna do Container:** `3000`
- **Reverse Proxy:** Traefik com SSL/TLS automático emitido via Coolify
- **Mecanismo de Sessão:** Volume persistente `/app/.sessions`

---

## 🛠️ 2. Configuração no Coolify

Para criar o serviço WAHA no Coolify:

1. **Criar Nova Aplicação no Coolify:**
   - Tipo: **Docker Image**
   - Imagem: `devlikeapro/waha:latest` (ou tag estável `devlikeapro/waha:core`)
   - Nome: `barberflow-waha`
   - Domínio / FQDN: `https://evo.projetosunion.cloud`

2. **Mapeamento de Volumes Persistentes:**
   ```yaml
   volumes:
     - waha_sessions:/app/.sessions
   ```

3. **Variáveis de Ambiente Recomendadas:**
   ```env
   TZ=America/Sao_Paulo
   WAHA_API_KEY=bf_waha_sec_9e06180371424a1b80c355fb5dc21182
   WAHA_DASHBOARD_ENABLED=true
   WAHA_DASHBOARD_USERNAME=admin
   WAHA_DASHBOARD_PASSWORD=barberflow_admin_sec_2026
   WHATSAPP_HOOK_URL=https://n8n.srv1194775.hstgr.cloud/webhook/barberflow-waha-inbound
   WHATSAPP_HOOK_EVENTS=message,message.any,session.status
   ```

---

## 🔄 3. Endpoints Utilizados pelo BarberFlow

- `GET /api/sessions?all=true` — Lista todas as sessões e status de conexão
- `POST /api/sessions/{session}/start` — Inicializa a instância do WhatsApp
- `GET /api/sessions/{session}/auth/qr` — Obtém o QR Code em tempo real
- `POST /api/sendText` — Envia mensagem de texto/confirmação
- `POST /api/sendPresence` — Simula digitação / gravação de áudio
