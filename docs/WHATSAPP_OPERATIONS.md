# BarberFlow — Operação e Manutenção do Bot WhatsApp

## 1. Rotina de Operação

### A. Fluxo de Atendimento do Cliente
1. **Primeiro Contato**: Cliente envia mensagem e o sistema detecta se já é cadastrado ou solicita o nome para cadastro instantâneo.
2. **Escolha do Serviço e Profissional**: Menus numéricos objetivos com valores formatados em R$.
3. **Seleção de Data e Horário**: Listagem exclusiva de horários vagos que respeitam horário de funcionamento e duração do serviço.
4. **Confirmação e Agendamento**: Criação do registro no banco de dados com origem `WHATSAPP` e snapshot do preço.
5. **Links de Calendário**: Envio do link do Google Calendar e link do arquivo `.ics` universal.

### B. Disparo Automático de Lembretes
O BarberFlow mantém um worker de fila de lembretes que roda periodicamente e avalia agendamentos futuros:
- **T-6h**: Lembrete antecipado para planejamento do dia.
- **T-2h**: Lembrete principal com opção rápida de confirmação ou remarcação.
- **T-1h**: Alerta final de deslocamento.

---

## 2. Monitoramento e Auditoria
- Todas as mensagens enviadas e recebidas são registradas na tabela `WhatsappMessage` com status (`SENT`, `FAILED`), timestamp, payload e telefone de destino.
- Nenhuma senha, token ou credencial é gravada nos logs de aplicação.
- Para verificar a saúde da conexão do WhatsApp, consulte o endpoint `/api/health`.
