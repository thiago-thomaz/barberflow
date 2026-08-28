# BarberFlow — n8n WhatsApp & Reminders Architecture (Fase 11)

## 📌 Visão Geral da Integração n8n

O **n8n** atua como o orquestrador de mensagens externas e cron jobs, enquanto o **BarberFlow** permanece como a única fonte de verdade e motor decisório para regras de negócio, disponibilidade, preços, clientes e segurança.

---

## 🔄 Fluxos de Trabalho n8n

### Flow 1: Incoming Message (WhatsApp Webhook)
```
[WhatsApp Gateway / Meta] ➔ [n8n Webhook] ➔ [POST /api/webhooks/whatsapp] ➔ [Retorna resposta conversacional]
```

### Flow 2: Booking via WhatsApp
```
[n8n] ➔ [GET /api/public/whatsapp/availability] ➔ [Exibe slots] ➔ [POST /api/public/whatsapp/appointments]
```

### Flow 3: Lembretes Automáticos com Cron do n8n
```
[n8n Cron (A cada 5 ou 15 min)]
           │
           ▼
[POST /api/internal/reminders/due]
           │
           ▼
[BarberFlow dispara lembretes idempotentes (T-24h, T-6h, T-2h, T-1h) e marca como SENT]
```

### Flow 4: Cancelamento & Remarcação
```
[WhatsApp "Cancelar"] ➔ [n8n] ➔ [POST /api/public/whatsapp/next-appointment] ➔ [Atualiza status e cancela lembretes pendentes]
```

---

## 🔐 Autenticação & Idempotência
1. **Idempotência:** Cada lembrete possui a constraint `@@unique([appointmentId, reminderType])`. Execuções simultâneas do n8n nunca enviam mensagens duplicadas.
2. **Assinatura HMAC-SHA256:** Todos os webhooks enviados pelo BarberFlow acompanham o header `X-BarberFlow-Signature`.
