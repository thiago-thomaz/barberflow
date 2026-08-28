# BarberFlow — n8n Orchestration Architecture for WAHA (Fase 11)

## 📌 1. Visão Geral dos Workflows

Na instância `https://n8n.srv1194775.hstgr.cloud/api/v1`, criamos 2 workflows isolados dedicados ao BarberFlow:

1. **`[BARBERFLOW] - WAHA Inbound & Conversational Orchestrator` (ID: `YRQYwN7VvEwlPY8C`)**
   - **Gatilho:** Webhook POST `/webhook/barberflow-waha-inbound`
   - **Nó 2 (Code):** Normaliza telefone (E.164), ignora mensagens enviadas pelo próprio bot (`fromMe: true`) e deduplica `messageId`.
   - **Nó 3 (HTTP Request):** Invoca a API conversacional do BarberFlow em `https://barber.projetosunion.cloud/api/webhooks/whatsapp`.

2. **`[BARBERFLOW] - WhatsApp Reminders Cron (T-24h, T-6h, T-2h, T-1h)` (ID: `JqrqRlyMlEcnoWLO`)**
   - **Gatilho:** Schedule Trigger a cada 5 minutos (`*/5 * * * *`).
   - **Nó 2 (HTTP Request):** Dispara `POST https://barber.projetosunion.cloud/api/internal/reminders/due`, processando lembretes vencidos com idempotência e garantia de zero duplicação.

3. **`[BARBERFLOW] - Central de Notificações & Automações WhatsApp` (ID: `qvThqBY5e83PmsWS`)**
   - **Gatilho:** Webhook POST `/webhook/barberflow-events`
   - **Ação:** Recepção de eventos do BarberFlow (`APPOINTMENT_CREATED`, `APPOINTMENT_CANCELLED`, `CUSTOMER_AT_RISK`).

---

## 🛡️ 2. Garantia de Isolamento
Nenhum dos outros 40 fluxos existentes no n8n foi alterado ou impactado. Todas as rotas de webhook utilizam prefixos exclusivos (`barberflow-*`).
