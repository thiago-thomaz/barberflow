# Motor de Recorrência & "Dinheiro Deixado na Mesa"

O grande diferencial competitivo do **BarberFlow** é transformar o sistema de agendamento em um motor de geração ativa de receita para barbearias.

---

## 1. Como Funciona o Cálculo de Ciclo Individual

Diferente de sistemas legados que adotam um número fixo (ex: 30 dias para todos), o BarberFlow analisa o comportamento real de cada cliente:

1. **Histórico de Visitas Concluídas**:
   Coleta as datas de todos os agendamentos com status `CONCLUIDO`.
2. **Intervalos Entre Visitas**:
   Calcula a diferença em dias entre cada atendimento consecutivo:
   $$\Delta t_i = \text{Data}_{i} - \text{Data}_{i-1}$$
3. **Mediana e Média Individual**:
   Calcula a mediana matemática dos intervalos para eliminar distorções de visitas atípicas.
4. **Previsão de Retorno**:
   $$\text{Próxima Visita Estimada} = \text{Última Visita} + \text{Mediana do Ciclo}$$

---

## 2. Classificação de Status

| Status | Critério de Classificação |
|---|---|
| `NOVO` | Cliente com 0 ou 1 atendimento recente. |
| `ATIVO` | Cliente com 2+ visitas dentro do período de $\le 1.25 \times \text{ciclo}$. |
| `EM_RISCO` | Cliente que ultrapassou $1.25 \times \text{ciclo}$ sem agendar. |
| `INATIVO` | Cliente ausente por mais de $2.0 \times \text{ciclo}$. |
| `VIP` | Cliente com 5+ visitas concluídas e ticket médio elevado ($\ge \text{R\$} 45$). |

---

## 3. "Dinheiro Deixado na Mesa" (*Revenue Opportunity*)

O sistema calcula a receita em risco multiplicando o ticket médio de cada cliente pela quantidade de clientes em risco e inativos:

$$\text{Dinheiro na Mesa} = \sum_{c \in \text{Risco} \cup \text{Inativo}} \text{TicketMédio}_c$$

### Ações de Reativação Disponíveis:
- **Disparo no WhatsApp em 1-Clique**: Gera links com mensagens personalizadas e cordiais, abordando o cliente no momento certo sem parecer spam.
- **Webhooks Automáticos no n8n**: Dispara os eventos `CUSTOMER_AT_RISK` e `CUSTOMER_INACTIVE` para automações de régua de comunicação (D+30, D+37, D+45).
