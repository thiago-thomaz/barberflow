# BarberFlow — Academia 2.0 Security & Multi-Tenancy (Fase 16)

## 1. Princípios de Segurança e Privacidade

1. **Isolamento Estrito de Tenants (Multi-Tenancy)**:
   - Todas as requisições para `/api/academia/diagnostic` e `/api/academia/action-plan` validam a sessão JWT via `getSessionFromRequest(req)`.
   - Os diagnósticos, métricas reais, snapshots e planos de ação são gravados e filtrados exclusivamente pelo `barbershopId` autenticado.
   - Nenhuma barbearia pode visualizar ou modificar planos de ação ou históricos de outra barbearia.

2. **Privacidade e Proteção de Dados (LGPD)**:
   - Nenhum dado de clientes ou valores de faturamento é compartilhado ou enviado a provedores externos de IA.
   - Todo o processamento de regras heurísticas e cálculos de score ocorre de forma 100% determinística no servidor do BarberFlow.

3. **Zero Custos e Chaves de API**:
   - O sistema é completamente independente de chaves pagas (OpenAI, Anthropic, Gemini, etc.).
   - A disponibilidade do serviço de consultoria é de 100% sem dependência de cotas externas de rate-limit.

4. **Integridade de Links Oficiais**:
   - Todas as recomendações apontam estritamente para conteúdos gratuitos oficiais auditados (Sebrae, Fundação Bradesco, SENAI, ENAP, Gov.br).
