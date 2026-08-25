# Integração BarberFlow + n8n

O **BarberFlow** foi arquitetado nativamente para integração com o **n8n** (e provedores de mensageria como Evolution API, Z-API, Baileys ou WhatsApp Cloud API).

---

## 1. Autenticação e Segurança dos Webhooks

Todas as requisições enviadas pelo BarberFlow para o seu webhook do n8n contêm os seguintes cabeçalhos HTTP:

| Cabeçalho | Descrição |
|---|---|
| `Content-Type` | `application/json` |
| `X-BarberFlow-Event` | Nome do evento disparado (ex: `APPOINTMENT_CREATED`) |
| `X-BarberFlow-Signature` | Assinatura HMAC-SHA256 do corpo bruto da requisição em hexadecimal |
| `X-BarberFlow-Timestamp` | Timestamp ISO-8601 do envio para prevenção de replay attacks |

### Validação da Assinatura no n8n (Nó Code / Function)
```javascript
const crypto = require('crypto');

const secret = 'SUA_CHAVE_HMAC_CONFIGURADA';
const receivedSignature = $headers['x-barberflow-signature'];
const rawBody = JSON.stringify($json);

const calculatedSignature = crypto
  .createHmac('sha256', secret)
  .update(rawBody)
  .digest('hex');

if (receivedSignature !== calculatedSignature) {
  throw new Error('Assinatura inválida! Requisição não autorizada.');
}

return $input.all();
```

---

## 2. Catálogo de Eventos e Payloads JSON

### 2.1. `APPOINTMENT_CREATED`
Disparado quando um novo agendamento é criado (pelo painel interno ou pelo link público).
```json
{
  "event": "APPOINTMENT_CREATED",
  "timestamp": "2026-08-25T15:30:00.000Z",
  "tenant_id": "barbershop-uuid",
  "data": {
    "appointmentId": "app-uuid",
    "publicToken": "clx123abc456",
    "customerName": "Lucas Silva",
    "customerPhone": "11987654321",
    "barberName": "Rodrigo Silva",
    "serviceName": "Corte + Barba",
    "price": 85.00,
    "scheduledAt": "2026-08-26T14:30:00.000Z"
  }
}
```

### 2.2. `APPOINTMENT_CONFIRMED`
Disparado quando o agendamento é confirmado.
```json
{
  "event": "APPOINTMENT_CONFIRMED",
  "timestamp": "2026-08-25T16:00:00.000Z",
  "tenant_id": "barbershop-uuid",
  "data": {
    "appointmentId": "app-uuid",
    "customerName": "Lucas Silva",
    "customerPhone": "11987654321",
    "scheduledAt": "2026-08-26T14:30:00.000Z"
  }
}
```

### 2.3. `APPOINTMENT_CANCELLED`
Disparado quando um agendamento é cancelado pelo cliente ou pela barbearia.
```json
{
  "event": "APPOINTMENT_CANCELLED",
  "timestamp": "2026-08-25T17:00:00.000Z",
  "tenant_id": "barbershop-uuid",
  "data": {
    "appointmentId": "app-uuid",
    "customerName": "Lucas Silva",
    "customerPhone": "11987654321",
    "barberName": "Rodrigo Silva",
    "cancelReason": "Imprevisto no trabalho"
  }
}
```

### 2.4. `APPOINTMENT_COMPLETED`
Disparado ao finalizar o atendimento e registrar o pagamento.
```json
{
  "event": "APPOINTMENT_COMPLETED",
  "timestamp": "2026-08-25T15:15:00.000Z",
  "tenant_id": "barbershop-uuid",
  "data": {
    "appointmentId": "app-uuid",
    "customerName": "Lucas Silva",
    "customerPhone": "11987654321",
    "serviceName": "Corte Degradê",
    "price": 50.00,
    "paymentMethod": "PIX"
  }
}
```

### 2.5. `CUSTOMER_AT_RISK` (Motor de Recorrência)
Disparado quando o cliente ultrapassa 1.25x seu ciclo habitual sem agendar.
```json
{
  "event": "CUSTOMER_AT_RISK",
  "timestamp": "2026-08-25T18:00:00.000Z",
  "tenant_id": "barbershop-uuid",
  "data": {
    "customerId": "cust-uuid",
    "customerName": "Marcos Andrade",
    "customerPhone": "11988887777",
    "daysSinceLastVisit": 35,
    "cycleDays": 25,
    "avgTicket": 65.00
  }
}
```

### 2.6. `CUSTOMER_INACTIVE` (Recuperação Longo Prazo)
Disparado quando o cliente ultrapassa 2x o seu ciclo de corte.
```json
{
  "event": "CUSTOMER_INACTIVE",
  "timestamp": "2026-08-25T18:00:00.000Z",
  "tenant_id": "barbershop-uuid",
  "data": {
    "customerId": "cust-uuid",
    "customerName": "Bruno Costa",
    "customerPhone": "11977776666",
    "daysSinceLastVisit": 60,
    "cycleDays": 28,
    "avgTicket": 55.00
  }
}
```

---

## 3. Os 7 Workflows Essenciais no n8n

1. **Confirmação Imediata de Agendamento**:
   - Trigger: `APPOINTMENT_CREATED`
   - Ação: Envia WhatsApp com data, hora, profissional e link para gerenciar (`/agendamento/[token]`).
2. **Lembrete de Horário (D-1 e D-0)**:
   - Trigger: Cron / Agendado
   - Ação: Envia lembrete 2h antes com botões interativos de confirmação.
3. **Pós-Atendimento e Google Reviews**:
   - Trigger: `APPOINTMENT_COMPLETED`
   - Ação: Aguarda 2 horas e envia mensagem agradecendo e solicitando avaliação 5 estrelas no Google Meu Negócio.
4. **Alerta de Cliente em Risco (Reativação Automática)**:
   - Trigger: `CUSTOMER_AT_RISK`
   - Ação: Envia mensagem amigável no WhatsApp: *"Fala [Nome], notamos que faz [X] dias do seu último corte..."*.
5. **Campanha de Inativos com Oferta Especial**:
   - Trigger: `CUSTOMER_INACTIVE`
   - Ação: Envia cupom de retorno ou condição especial de resgate.
6. **Lembrete de Ciclo Recorrente**:
   - Trigger: `CUSTOMER_DUE_FOR_RETURN`
   - Ação: Convida o cliente a reservar antes que as vagas da semana acabem.
7. **Cancelamento e Liberação de Grade**:
   - Trigger: `APPOINTMENT_CANCELLED`
   - Ação: Notifica o barbeiro e atualiza status.
