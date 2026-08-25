# Referência de APIs REST — BarberFlow

Todas as rotas privadas exigem autenticação via cookie JWT de sessão (`barberflow_session`) obtido no login. As rotas públicas começam com `/api/public/`.

---

## 1. Autenticação & Sessão
- `POST /api/auth/login`: Autentica o usuário com email e senha.
- `POST /api/auth/register`: Cadastro de novo tenant + dono (Onboarding).
- `POST /api/auth/logout`: Invalida o cookie de sessão.
- `GET /api/auth/me`: Retorna os dados do usuário autenticado e barbearia.

---

## 2. Clientes & Recorrência
- `GET /api/customers`: Lista clientes com filtros de pesquisa (`search`), `status` e paginação.
- `POST /api/customers`: Cadastra novo cliente com normalização de telefone.
- `GET /api/customers/[id]`: Detalhes do cliente com histórico completo de atendimentos.
- `PATCH /api/customers/[id]`: Atualiza dados do cliente.
- `DELETE /api/customers/[id]`: Soft-delete do cliente (`deletedAt`).
- `GET /api/recurrence`: Métricas globais de recorrência e total de "Dinheiro na Mesa".
- `GET /api/recurrence/at-risk`: Lista clientes em risco com ticket e link WhatsApp pré-gerado.
- `GET /api/recurrence/due-for-return`: Clientes no intervalo imediato de retorno.
- `GET /api/recurrence/inactive`: Clientes inativos para campanhas de resgate.
- `POST /api/recurrence/recalculate`: Força recálculo síncrono de toda a base.

---

## 3. Barbeiros, Serviços & Horários
- `GET /api/barbers` & `POST /api/barbers`: Listagem e cadastro de barbeiros.
- `PATCH /api/barbers/[id]` & `DELETE /api/barbers/[id]`: Edição e soft-delete de barbeiro.
- `GET /api/services` & `POST /api/services`: Listagem e cadastro de serviços.
- `PATCH /api/services/[id]` & `DELETE /api/services/[id]`: Edição e soft-delete de serviço.
- `GET /api/business-hours` & `PUT /api/business-hours`: Leitura e configuração dos horários de funcionamento por dia da semana.

---

## 4. Agenda & Atendimentos
- `GET /api/appointments?date=YYYY-MM-DD`: Retorna grade de agendamentos com filtros.
- `POST /api/appointments`: Cria agendamento com validação anti-conflito e snapshot de preço.
- `PATCH /api/appointments/[id]/confirm`: Transição para `CONFIRMADO`.
- `PATCH /api/appointments/[id]/start`: Transição para `EM_ATENDIMENTO`.
- `PATCH /api/appointments/[id]/complete`: Transição para `CONCLUIDO` + registro de pagamento.
- `PATCH /api/appointments/[id]/cancel`: Transição para `CANCELADO` com motivo.
- `PATCH /api/appointments/[id]/no-show`: Transição para `NO_SHOW` e contagem de faltas.

---

## 5. Dashboard & Financeiro
- `GET /api/dashboard`: KPIs de Hoje (previsto, realizado, horários vagos, alertas e fila em tempo real).
- `GET /api/financial`: Faturamento (hoje, semana, mês), ticket médio, comissões por barbeiro e formas de pagamento.

---

## 6. Agendamento Público & Autoatendimento
- `GET /api/public/[slug]`: Perfil público da barbearia, serviços e profissionais ativos.
- `GET /api/public/[slug]/available-slots?date=YYYY-MM-DD&serviceId=XYZ`: Retorna horários livres sem conflito.
- `POST /api/public/[slug]/book`: Agendamento público sem login com geração de `publicToken`.
- `GET /api/public/appointment/[token]`: Consulta status do agendamento pelo cliente.
- `PATCH /api/public/appointment/[token]`: Cancelamento ou remarcação pelo próprio cliente.

---

## 7. Webhooks & n8n
- `GET /api/webhooks` & `POST /api/webhooks`: Gestão de endpoints de webhook.
- `PATCH /api/webhooks/[id]` & `DELETE /api/webhooks/[id]`: Atualização e exclusão de webhook.
- `POST /api/webhooks/test`: Disparo de ping de teste com assinatura HMAC-SHA256 e medição de latência.
