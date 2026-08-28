# BarberFlow — Universal Calendar Integration (.ics + Google Calendar)

## 📅 Visão Geral

O módulo de calendário do BarberFlow permite que os clientes adicionem seus agendamentos diretamente ao calendário do celular (iPhone, Android, Apple Calendar, Google Calendar e Outlook) com um único clique.

---

## 🛠️ Especificação RFC 5545 (.ics)

- **Endpoint Seguro:** `GET /api/calendar/appointment/[token].ics`
- **Content-Type:** `text/calendar; charset=utf-8`
- **Headers:** `Content-Disposition: attachment; filename="agendamento-XXXX.ics"`
- **Estrutura Gerada:**
  ```ics
  BEGIN:VCALENDAR
  VERSION:2.0
  PRODID:-//BarberFlow//Universal Booking Calendar//PT
  CALSCALE:GREGORIAN
  METHOD:PUBLISH
  BEGIN:VEVENT
  UID:tok_12345@barberflow.projetosunion.cloud
  DTSTAMP:20260829T100000Z
  DTSTART:20260829T170000Z
  DTEND:20260829T173000Z
  SUMMARY:Corte Tradicional - Barbearia Imperial
  DESCRIPTION:✂️ Serviço: Corte Tradicional\n👤 Profissional: Carlos Silva\n💰 Valor: R$ 40,00\n🔗 Gerenciar: https://barber.projetosunion.cloud/agendamento/tok_12345
  LOCATION:Rua Augusta, 1500 - Barbearia Imperial
  STATUS:CONFIRMED
  BEGIN:VALARM
  ACTION:DISPLAY
  DESCRIPTION:Lembrete de Horário na Barbearia
  TRIGGER:-PT1H
  END:VALARM
  END:VEVENT
  END:VCALENDAR
  ```

---

## 🔗 Google Calendar Web Intent

- Não requer OAuth nem credenciais de conta do Google dentro do BarberFlow.
- Monta a URL parametrizada:
  ```
  https://calendar.google.com/calendar/render?action=TEMPLATE&text={TITLE}&dates={START}/{END}&details={DETAILS}&location={LOCATION}
  ```
