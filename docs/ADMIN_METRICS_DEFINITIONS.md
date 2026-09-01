# 📊 BARBERFLOW SAAS — DEFINIÇÃO MATEMÁTICA DE MÉTRICAS (METRICS DEFINITIONS)

**Data:** 01/09/2026  
**Documento de Referência:** `docs/ADMIN_METRICS_DEFINITIONS.md`  
**Objetivo:** Estabelecer fórmulas canônicas, fontes de dados e limitações matemáticas para todas as métricas do BarberFlow Admin.

---

## 1. MRR (Monthly Recurring Revenue / Receita Recorrente Mensal)

### Definição
Soma da receita mensal normalizada gerada por todas as assinaturas ativas e pagantes do SaaS no momento da apuração.

### Fórmula Matemática
$$\text{MRR} = \sum_{s \in S_{\text{ACTIVE}}} \text{MonthlyPrice}(s)$$

Onde:
- $S_{\text{ACTIVE}}$ é o conjunto de assinaturas com status `ACTIVE`.
- Se o plano for anual (`interval === 'YEARLY'`), $\text{MonthlyPrice}(s) = \frac{\text{PlanPrice}(s)}{12}$.
- Assinaturas em `TRIALING`, `PAST_DUE` (inadimplente), `CANCELLED` ou `EXPIRED` **NÃO** compõem o MRR.

### Fonte de Dados
Tabela `Subscription` inner join `Plan` onde `Subscription.status = 'ACTIVE'`.

---

## 2. ARR (Annual Recurring Revenue / Receita Recorrente Anual Estimada)

### Definição
Projeção anual da receita recorrente com base no MRR atual contratado.

### Fórmula Matemática
$$\text{ARR} = \text{MRR} \times 12$$

---

## 3. ARPU (Average Revenue Per User / Ticket Médio por Assinante Ativo)

### Definição
Receita média mensal gerada por cada barbearia assinante ativa pagante.

### Fórmula Matemática
$$\text{ARPU} = \begin{cases} \frac{\text{MRR}}{|S_{\text{ACTIVE}}|}, & \text{se } |S_{\text{ACTIVE}}| > 0 \\ 0, & \text{se } |S_{\text{ACTIVE}}| = 0 \end{cases}$$

---

## 4. Churn Rate (Taxa de Cancelamento de Assinantes)

### Definição
Percentual de assinantes que cancelaram suas contas em relação à base total de clientes que já assinaram no período.

### Fórmula Matemática
$$\text{Churn Rate (\%)} = \begin{cases} \frac{N_{\text{canceladas}}}{N_{\text{total\_assinaturas}}} \times 100, & \text{se } N_{\text{total\_assinaturas}} > 0 \\ 0, & \text{se } N_{\text{total\_assinaturas}} = 0 \end{cases}$$

Onde:
- $N_{\text{canceladas}}$ é a quantidade de assinaturas com status `CANCELLED`.
- $N_{\text{total\_assinaturas}}$ é a contagem total de assinaturas registradas.

---

## 5. Retention Rate (Taxa de Retenção de Assinantes)

### Definição
Percentual de assinantes mantidos ativos na plataforma.

### Fórmula Matemática
$$\text{Retention Rate (\%)} = 100\% - \text{Churn Rate (\%)} = \frac{N_{\text{ativas}}}{N_{\text{total\_assinaturas}}} \times 100$$

---

## 6. Trial Conversion Rate (Taxa de Conversão de Teste para Pago)

### Definição
Percentual de barbearias que iniciaram o período de teste e converteram para uma assinatura paga ativa.

### Fórmula Matemática
$$\text{Trial Conversion (\%)} = \begin{cases} \frac{N_{\text{ativas\_historico\_trial}}}{N_{\text{trials\_iniciados}}} \times 100, & \text{se } N_{\text{trials\_iniciados}} > 0 \\ 0, & \text{se } N_{\text{trials\_iniciados}} = 0 \end{cases}$$

---

## 7. Inadimplência (Past Due / Default Rate)

### Definição
Percentual e montante de receita sob risco devido a pagamentos vencidos não liquidados.

### Fórmula Matemática
$$\text{Inadimplência (\%)} = \frac{N_{\text{PAST\_DUE}}}{N_{\text{ativas}} + N_{\text{PAST\_DUE}}} \times 100$$
$$\text{Receita Inadimplente (R\$)} = \sum_{s \in S_{\text{PAST\_DUE}}} \text{PlanPrice}(s)$$

---

## 8. LTV (Lifetime Value / Valor do Ciclo de Vida do Cliente)

### Definição
Estimativa do valor financeiro total gerado por um cliente antes de cancelar.

### Fórmula Matemática
$$\text{LTV} = \begin{cases} \frac{\text{ARPU}}{\text{Monthly Churn Rate}}, & \text{se } \text{Monthly Churn Rate} > 0 \\ \text{ARPU} \times 24 \text{ (teto estimado para churn zero)}, & \text{se } \text{Monthly Churn Rate} = 0 \end{cases}$$

*Nota de Limitação:* Se não houver histórico de churn suficiente ($N_{\text{canceladas}} = 0$ ou base jovem), a plataforma exibe: *"Dados históricos insuficientes para cálculo de LTV"*.

---

## 9. Resumo de Dados Ausentes & Transparência
Em conformidade com a Regra Absoluta contra Dados Falsos:
- Se qualquer métrica não possuir transações ou registros suficientes no banco SQLite real, a resposta da API e a interface de visualização retornará expressamente `"Dado não disponível"` ou `"Ainda não há dados suficientes"`.
- Proibida a geração de mock data, sementes artificiais ou números arbitrários no frontend ou backend do `/admin`.
