# BarberFlow — Resolução de Problemas WhatsApp (Troubleshooting)

## 1. Problemas Comuns e Soluções

### A. WAHA ou n8n Offline / Fora do Ar
- **Comportamento do Sistema**: O núcleo do BarberFlow não é bloqueado nem perde agendamentos. A agenda web, o agendamento público e o módulo financeiro continuam funcionando normalmente.
- **Ação**:
  1. Verificar se o container do WAHA está ativo via `docker ps | grep waha`.
  2. Verificar os logs do WAHA via `docker logs waha --tail 50`.
  3. Reiniciar a sessão no WAHA se o QR Code tiver sido deslogado do celular.

### B. Mensagem Inbound Não Respondida
- **Causas Possíveis**:
  1. URL do webhook no WAHA incorreta.
  2. O número receptor (`receiverPhone` ou `phone_number_id`) não corresponde ao telefone de nenhuma barbearia cadastrada no BarberFlow.
- **Ação**:
  - Verificar no painel de Configurações da Barbearia (`/configuracoes`) se o telefone comercial cadastrado coincide com o número conectado ao WAHA.

### C. Cliente Relata Horário Ocupado no Momento da Confirmação
- **Causa**: Outro cliente ou a recepção física reservou o horário milissegundos antes da confirmação final no WhatsApp.
- **Comportamento Esperado**: A engine anti-conflito protege a integridade e apresenta horários alternativos imediatamente.

### D. Falha no Envio de Lembretes
- **Causas**:
  1. Agendamento foi cancelado antes do horário de disparo (comportamento correto: lembretes são cancelados automaticamente).
  2. O cliente solicitou "SAIR" (opt-out de marketing e notificações).
- **Ação**:
  - Consultar a tabela `AppointmentReminder` para verificar o status do lembrete (`PENDING`, `SENT`, `CANCELLED`).
