# BarberFlow — WhatsApp API Contract (Fase 11)

## 📡 Endpoints Oficiais

### 1. Inbound Webhook
- **URL:** `POST /api/webhooks/whatsapp`
- **Headers:** `Content-Type: application/json`
- **Body:**
  ```json
  {
    "from": "5514998016163",
    "text": "Quero cortar cabelo amanhã",
    "tenantSlug": "barbearia-imperial"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "result": {
      "reply": "Perfeito! 😊 Qual serviço você deseja agendar?...",
      "state": "SELECTING_SERVICE"
    }
  }
  ```

---

### 2. Consulta de Disponibilidade Real
- **URL:** `GET /api/public/whatsapp/availability?slug=barbearia-imperial&date=2026-08-29&serviceId=...&barberId=...`
- **Response:**
  ```json
  {
    "barbershop": { "id": "...", "name": "Barbearia Imperial", "slug": "barbearia-imperial" },
    "date": "2026-08-29",
    "availableSlots": ["09:00", "09:30", "10:00", "14:00", "14:30"],
    "totalAvailable": 5
  }
  ```

---

### 3. Criação de Agendamento Oficial
- **URL:** `POST /api/public/whatsapp/appointments`
- **Body:**
  ```json
  {
    "slug": "barbearia-imperial",
    "customerName": "Thiago Thomaz",
    "customerPhone": "5514998016163",
    "serviceId": "clt_service_123",
    "barberId": "clt_barber_456",
    "date": "2026-08-29",
    "time": "14:00"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "appointment": {
      "id": "clt_app_789",
      "publicToken": "tok_abc123",
      "scheduledAt": "2026-08-29T17:00:00.000Z",
      "publicUrl": "https://barber.projetosunion.cloud/agendamento/tok_abc123",
      "googleCalendarUrl": "https://calendar.google.com/calendar/render?action=TEMPLATE...",
      "icsCalendarUrl": "/api/calendar/appointment/tok_abc123.ics"
    }
  }
  ```

---

### 4. Consulta e Cancelamento
- **URL (GET):** `GET /api/public/whatsapp/next-appointment?slug=barbearia-imperial&phone=5514998016163`
- **URL (POST):** `POST /api/public/whatsapp/next-appointment`
  ```json
  {
    "appointmentId": "clt_app_789",
    "phone": "5514998016163",
    "reason": "Cancelado via WhatsApp"
  }
  ```

---

### 5. Lembretes Vencidos (Cron / n8n Trigger)
- **URL (GET):** `GET /api/internal/reminders/due`
- **URL (POST):** `POST /api/internal/reminders/due`
  ```json
  {
    "success": true,
    "result": { "processed": 4, "details": [{ "id": "...", "status": "SENT", "type": "T_24H" }] }
  }
  ```
