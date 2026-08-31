# BarberFlow — Phase 17 Financial Management & DRE UAT

## 1. Escopo de Validação Financeira
Auditoria matemática completa dos módulos `/financeiro` e `/gestao-financeira`:
- **Contas a Pagar & Receber**: Ciclo de vida completo (Pendente, Pago, Recebido, Vencido, Cancelado).
- **Frente de Caixa (PDV)**: Abertura com fundo de troco, sangrias, suprimentos e fechamento com conciliação.
- **Divisão de Comissões**: Cálculo dinâmico por percentual de barbeiro sobre serviços realizados.
- **DRE Operacional (Demonstrativo do Resultado do Exercício)**:
  $$\text{Receita Bruta} - \text{Comissões de Barbeiros} - \text{Despesas Fixas e Variáveis} = \text{Lucro Líquido Real}$$

---

## 2. Cenário de Teste de Estresse Financeiro Executado
- **Atendimentos Criados**: 10 atendimentos de R$ 50,00 cada.
- **Formas de Pagamento**: Pix (3), Dinheiro (3), Cartão de Crédito (2), Cartão de Débito (2).
- **Receita Bruta Total**: R$ 500,00.
- **Comissões Calculadas (50%)**: R$ 250,00.
- **Despesas Operacionais Registradas**: R$ 150,00 (Compra de insumos e pomadas).
- **Lucro Líquido Calculado no Sistema**: R$ 100,00.
- **Saldo de Caixa Físico (Dinheiro)**: R$ 100,00 (Fundo inicial) + R$ 150,00 (3 cortes em dinheiro) = R$ 250,00.

---

## 3. Coerência Matemática dos Relatórios
- **Faturamento vs Dashboard**: 100% alinhados.
- **Caixa Físico vs Extrato de Transações**: 100% alinhados.
- **DRE vs Balancete**: 100% alinhados.
