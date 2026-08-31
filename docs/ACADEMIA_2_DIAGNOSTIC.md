# BarberFlow — Academia 2.0 Diagnostic Engine (Fase 16)

## 1. Funcionamento do Motor Determinístico

O motor opera em 3 camadas de dados:
1. **Fusão com Dados Reais**: Sempre que o tenant possui agendamentos, clientes, transações financeiras e barbeiros cadastrados no BarberFlow, essas métricas reais substituem estimativas manuais.
2. **Avaliação dos 6 Pilares (Total 100 Pontos)**:
   - **Pilar 1: Ocupação & Capacidade (20 pts)**:
     - Ocupação >= 70%: 20 pts (Excelente)
     - Ocupação 50-69%: 14 pts (Bom)
     - Ocupação 30-49%: 10 pts (Atenção)
     - Ocupação < 30%: 6 pts (Crítico)
   - **Pilar 2: Retenção & Clientes Inativos (20 pts)**:
     - Inativos < 15%: 20 pts
     - Inativos 15-25%: 14 pts
     - Inativos 26-35%: 10 pts
     - Inativos > 35%: 6 pts
   - **Pilar 3: Ticket Médio & Faturamento (20 pts)**:
     - Ticket >= R$ 55: 20 pts
     - Ticket R$ 42-54: 15 pts
     - Ticket R$ 30-41: 10 pts
     - Ticket < R$ 30: 6 pts
   - **Pilar 4: Gestão Financeira & Custos (20 pts)**:
     - 4 controles ativos (contas a pagar, custos, break-even, lucro): 20 pts
     - 3 controles: 15 pts
     - 2 controles: 10 pts
     - 1 controle: 6 pts
     - 0 controles: 4 pts
   - **Pilar 5: Fluxo de Caixa & Contas a Pagar (10 pts)**:
     - Contas a pagar e receber acompanhadas sem descasamento: 10 pts
     - Acompanhamento parcial: 6 pts
     - Contas a pagar próximas superiores a entradas previstas: 4 pts (Alerta preventivo)
   - **Pilar 6: Metas & Rotinas de Gestão (10 pts)**:
     - Metas de faturamento + acompanhamento de ocupação + campanhas: 10 pts
     - 2 práticas: 7 pts
     - 1 prática: 4 pts
3. **Classificação do Score de Saúde**:
   - `80 a 100`: **EXCELENTE**
   - `60 a 79`: **SAUDÁVEL**
   - `40 a 59`: **ATENÇÃO**
   - `0 a 39`: **CRÍTICO**
   - `DADOS_INSUFICIENTES`: Quando a barbearia é recém-criada e não há dados suficientes para uma pontuação justa.

---

## 2. As 15 Perguntas do Questionário

1. Quantos barbeiros trabalham atualmente?
2. Qual o faturamento médio mensal?
3. Quantos atendimentos realiza por mês?
4. Qual o ticket médio aproximado?
5. Quantos clientes ativos possui?
6. Quantos clientes estão sem voltar?
7. Você acompanha contas a pagar?
8. Você acompanha contas a receber?
9. Você sabe seu custo mensal?
10. Você sabe quanto precisa faturar para atingir o ponto de equilíbrio?
11. Você faz campanhas de reativação?
12. Você acompanha a taxa de ocupação?
13. Você possui meta mensal?
14. Você acompanha lucro líquido?
15. Qual seu maior problema atualmente? (Atrair clientes, Fazer clientes voltarem, Aumentar faturamento, Melhorar lucro, Controlar despesas, Organizar equipe, Melhorar marketing, Encher horários vazios, Não sei).
