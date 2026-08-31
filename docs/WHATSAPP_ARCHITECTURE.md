# BarberFlow — Arquitetura da Integração WhatsApp

## 1. Visão Geral
O módulo WhatsApp do BarberFlow foi projetado como uma **interface conversacional complementar** para o mesmo núcleo transacional do sistema. Ele não possui banco de dados paralelo nem regras de negócio duplicadas: consome exatamente os mesmos serviços de agendamento, validação anti-conflito, cálculo de disponibilidade e isolamento multi-tenant já certificados.

```
+-----------------------------------------------------------------------------------+
|                                  FLUXO INBOUND                                    |
|                                                                                   |
|  [ WhatsApp do Cliente ]                                                          |
|            |                                                                      |
|            v                                                                      |
|   [ WAHA / Meta Cloud ]                                                           |
|            |                                                                      |
|            v                                                                      |
|     [ Webhook / n8n ] (HMAC SHA-256)                                              |
|            |                                                                      |
|            v                                                                      |
|  [ BarberFlow API: POST /api/webhooks/whatsapp ]                                  |
|            |                                                                      |
|            v                                                                      |
|  [ Engine Conversacional: src/lib/whatsapp/engine.ts ]                            |
|     - Normalização E.164                                                          |
|     - Máquina de Estados (WhatsappSession TTL 30m)                                |
|     - Identificação / Cadastro de Customer                                        |
|     - Consulta de Disponibilidade Real (Anti-Conflito)                            |
|            |                                                                      |
|            v                                                                      |
|  [ Banco de Dados SQLite / Prisma ORM ]                                           |
|     - Appointment (origin: 'WHATSAPP')                                            |
|     - AppointmentReminder (T-6h, T-2h, T-1h)                                      |
+-----------------------------------------------------------------------------------+
```

```
+-----------------------------------------------------------------------------------+
|                                  FLUXO OUTBOUND                                   |
|                                                                                   |
|  [ Agendamento Criado / Disparo de Lembrete ]                                     |
|            |                                                                      |
|            v                                                                      |
|  [ Dispatcher / Provider: src/lib/whatsapp/provider.ts ]                          |
|     - WahaWhatsAppProvider (Produção)                                             |
|     - MockWhatsAppProvider (Testes / Sandbox)                                     |
|            |                                                                      |
|            v                                                                      |
|  [ WAHA HTTP API / n8n Dispatcher ]                                               |
|            |                                                                      |
|            v                                                                      |
|  [ WhatsApp do Cliente ]                                                          |
+-----------------------------------------------------------------------------------+
```

---

## 2. Componentes Principais

### A. Normalizador de Telefone & NLP (`src/lib/whatsapp/engine.ts`)
- **E.164 Canonical:** Converte formatos variados (`(14) 99888-7766`, `14998887766`, `+5514...`) para `5514998887766`.
- **Suporte a JIDs do WhatsApp:** Compatível com identificadores `@c.us` e `@lid`.
- **Parser de Texto & Emojis:** Normaliza números enviados como emojis (`1️⃣` -> `1`), remove caracteres de largura zero e mapeia intenções em linguagem natural.

### B. Máquina de Estados Conversacional
- **Sessão Persistente:** Tabela `WhatsappSession` indexada por `[barbershopId, phone]` com expiração TTL de 30 minutos.
- **Estados:**
  - `IDLE`: Menu principal
  - `SELECTING_SERVICE`: Escolha do corte/serviço
  - `SELECTING_BARBER`: Escolha do profissional ou "Qualquer um"
  - `SELECTING_DATE`: Escolha do dia ("hoje", "amanhã", "sábado", "25/08")
  - `SELECTING_TIME`: Seleção do slot vago
  - `CONFIRMING`: Confirmação dos dados com snapshot de preço
  - `AWAITING_NAME`: Cadastro simplificado para novos clientes
  - `CANCELLING`: Fluxo de cancelamento de horário existente
  - `RESCHEDULING`: Fluxo de remarcação de horário

### C. Proteção Anti-Conflito e Concorrência
- No momento exato da confirmação pelo cliente, a engine revalida a disponibilidade contra a tabela `Appointment` utilizando locking lógico e checagem de sobreposição `[scheduledAt < endAt] && [endAt > scheduledAt]`.
- Se o horário foi ocupado nos últimos segundos por outro canal, o agendamento é rejeitado e horários alternativos são sugeridos na hora.

### D. Calendário Universal (.ICS RFC 5545 & Google Calendar)
- Todo agendamento confirmado gera link universal para download de arquivo `.ics` (`/api/calendar/appointment/[token].ics`) e deep link direto para o Google Calendar.

### E. Lembretes Idempotentes (`src/lib/whatsapp/reminders.ts`)
- Agendamento automático de notificações pré-atendimento (T-6h, T-2h, T-1h).
- Restrição UNIQUE de banco em `[appointmentId, reminderType]` que impede envio duplicado.
- Cancelamento automático de lembretes pendentes caso o agendamento seja cancelado ou remarcado.

---

## 3. Isolamento Multi-Tenancy & Segurança
- Cada requisição identifica a barbearia pelo número de destino do WhatsApp (`receiverPhone`) ou pelo `tenantPhoneId`.
- Clientes de uma barbearia nunca têm acesso à agenda, profissionais ou serviços de outra barbearia.
- Conformidade LGPD: Envio da palavra "SAIR" ou "PARAR" desativa imediatamente o `marketingOptIn` no cadastro do cliente.
