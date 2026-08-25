# Monetização, Planos e Assinaturas — BarberFlow

O modelo de monetização do BarberFlow foi estruturado para suportar modelos de assinatura recorrente (SaaS B2B) com períodos de teste gratuito (*14-day free trial*).

---

## 1. Grade de Planos

| Recurso | Starter (R$ 59/mês) | Profissional (R$ 119/mês) | Business (R$ 229/mês) |
|---|---|---|---|
| **Barbeiros** | Até 2 profissionais | Até 10 profissionais | Até 30 profissionais |
| **Agendamentos Mensais** | Até 200 | Até 1.000 | Ilimitados |
| **Página Pública & QR Code** | Sim | Sim | Sim |
| **Motor de Recorrência** | Básico | Completo ("Dinheiro na Mesa") | Completo |
| **Automações n8n / Webhooks** | Não | Sim (HMAC-SHA256) | Sim |
| **Múltiplas Unidades** | Não | Não | Sim |

---

## 2. Ciclo de Vida da Assinatura

```
Cadastro no Onboarding
          │
          ▼
   TRIAL (14 dias)  ────(Não pagou ao fim do trial)────►  EXPIRED
          │                                                  │
   (Pagamento Aprovado)                               (Upgrade)
          │                                                  │
          ▼                                                  ▼
   ACTIVE (30 dias)  ◄───────────────────────────────────────┘
          │
   (Falha no Pagamento)
          │
          ▼
      PAST_DUE
```

---

## 3. Webhook de Gateway de Pagamento

- **Endpoint**: `POST /api/subscription/webhook`
- **Assinatura**: Validada via header `X-Gateway-Signature`
- **Eventos Suportados**: `payment.approved`, `invoice.paid`, `payment.failed`, `subscription.cancelled`.
- **Idempotência**: Garantida através de registros únicos na tabela `SubscriptionEvent`.
