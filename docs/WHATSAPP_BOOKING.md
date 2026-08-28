# BarberFlow — WhatsApp Booking Engine (Fase 11)

## 📌 Visão Geral

O **WhatsApp Booking Engine** do BarberFlow transforma o WhatsApp em um canal conversacional completo de autoatendimento, agendamento, consulta, cancelamento, remarcação e lembretes automáticos.

---

## 🏗️ Arquitetura de Comunicação

```
CLIENTE (WhatsApp)
       │
       ▼
WHATSAPP BUSINESS / META CLOUD API / n8n
       │
       ▼
POST /api/webhooks/whatsapp
       │
       ▼
BARBERFLOW CONVERSATIONAL ENGINE (Deterministic FSM)
       │
       ├── State Machine: IDLE ➔ SELECTING_SERVICE ➔ SELECTING_BARBER ➔ SELECTING_DATE ➔ SELECTING_TIME ➔ WAITING_CONFIRMATION
       ├── Anti-Conflict Transaction (Prisma $transaction)
       ├── LGPD Enforcement (Marketing Opt-out via "SAIR")
       └── Resilient TTL Sessions (WhatsappSession)
       │
       ▼
CONFIRMAÇÃO + LEMBRETES + CALENDÁRIO (.ics + Google Calendar)
```

---

## 💈 Fluxos Conversacionais

### 1. Menu Principal
- **Comandos aceitos:** `"Oi"`, `"Olá"`, `"Menu"`, `"Ajuda"`, `"1"`, `"2"`, etc.
- **Resposta:**
  ```text
  Olá! 👋 Sou o assistente virtual da Barbearia Imperial.

  Como posso te ajudar hoje?

  1️⃣ Agendar horário
  2️⃣ Ver meu próximo horário
  3️⃣ Cancelar agendamento
  4️⃣ Remarcar horário
  5️⃣ Falar com a barbearia
  ```

### 2. Agendamento com Confirmação Explícita
1. Cliente escolhe o serviço (ex: `1` para Corte).
2. Se houver mais de um barbeiro, escolhe o profissional ou `Qualquer barbeiro`.
3. Informa a data (`Hoje`, `Amanhã`, `Sábado`, `29/08`).
4. Seleciona o horário disponível retornado em tempo real pelo BarberFlow.
5. Se for novo cliente, cadastra o nome com validação LGPD.
6. **Confirmação explícita:**
   ```text
   ✂️ Confirme seu Horário:
   💈 Barbearia: Barbearia Imperial
   ✂️ Serviço: Corte Tradicional
   👤 Barbeiro: Carlos Silva
   📅 Data: 29/08/2026
   🕐 Horário: 14:00
   💰 Valor: R$ 40,00

   Confirmar agendamento?
   1️⃣ Sim, confirmar agora
   2️⃣ Não, cancelar
   ```
7. Criação atômica no banco, geração de lembretes automáticos e envio do link de Google Calendar + `.ics`.

### 3. Cancelamento e Remarcação Segura
- **Cancelar:** Localiza o próximo agendamento do cliente pelo telefone e solicita confirmação antes de cancelar. Cancela os lembretes pendentes imediatamente.
- **Remarcar:** Cria um novo agendamento com `rescheduledFromId` apontando para o horário anterior, preservando o histórico completo.

### 4. LGPD & Opt-out
- Ao enviar `"SAIR"`, `"PARAR"` ou `"OPTOUT"`, o sistema desativa `marketingOptIn = false` e silencia futuras mensagens de campanha, mantendo apenas lembretes transacionais confirmados.
