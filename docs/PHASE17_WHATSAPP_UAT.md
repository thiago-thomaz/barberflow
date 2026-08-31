# BarberFlow — Phase 17 WhatsApp, WAHA & Reminders UAT

## 1. Arquitetura de Integração
```
WhatsApp (Cliente)
    ↕
WAHA (WhatsApp HTTP API)
    ↕
n8n (Orquestrador de Webhooks & Templates)
    ↕
BarberFlow API (Motor Conversacional & Agendamento)
    ↕
Banco de Dados (Sessões, Conflitos & Lembretes)
```

---

## 2. Máquina de Estados e Intenções Naturais
O motor conversacional do BarberFlow processa fluxos naturais mantendo contexto por telefone e tenant:
- **Saudação / Início**: Reconhece "Oi", "Olá", "Quero agendar".
- **Identificação do Cliente**: Busca por telefone cadastrado (E.164); caso novo, solicita nome completo.
- **Seleção de Serviço & Barbeiro**: Mapeia serviços cadastrados e barbeiros ativos.
- **Cliente Recorrente ("O de sempre")**: Identifica histórico de corte e profissional favorito e sugere confirmação direta sem ambiguidades.
- **Tratamento de Conflito de Horário**: Quando o horário solicitado está ocupado, o motor oferece os 3 horários disponíveis mais próximos no mesmo dia.
- **Confirmação & Link de Calendário**: Emissão de mensagem com resumo detalhado e link RFC 5545 (`.ics`) para adição instantânea no Google Calendar ou Apple Calendar.

---

## 3. Motor de Lembretes Inteligentes (Timezone America/Sao_Paulo)
- **T-24h**: Lembrete de confirmação de presença com botões de confirmar ou reagendar.
- **T-6h / T-2h / T-1h**: Lembretes pontuais de aviso.
- **Idempotência**: Cada tipo de lembrete por agendamento possui chave única de execução, impedindo mensagens duplicadas em caso de retry do webhook.
- **Cancelamento Automático**: Cancelamentos ou reagendamentos cancelam lembretes anteriores e criam a nova timeline sincronizada.
