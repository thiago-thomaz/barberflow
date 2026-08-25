# Plano e Relatório de QA — BarberFlow

Este documento detalha o processo de garantia de qualidade (QA), execução de testes automatizados e critérios de aceitação do sistema.

---

## 1. Cobertura de Testes Automatizados

O sistema conta com **31 testes automatizados** cobrindo os cenários mais críticos:

| Suíte de Teste | Arquivo | Cobertura | Status |
|---|---|---|---|
| **Fase 2: Core & Anti-Conflito** | `tests/phase2.test.js` | Conflitos parciais, exatos, englobando, adjacentes, concorrência simultânea e multitenancy | **14/14 PASS** |
| **Fase 3: Recorrência** | `tests/phase3.test.js` | Mediana de intervalos, transições de status (NOVO/ATIVO/EM_RISCO/INATIVO/VIP) e Revenue Opportunity | **8/8 PASS** |
| **Fase 4: Dashboard & Financeiro** | `tests/phase4_dashboard.test.js` | Faturamento, ticket médio, comissões de barbeiros e meios de pagamento | **3/3 PASS** |
| **Fase 5: Agendamento Público** | `tests/phase5_public_booking.test.js` | Agendamento sem login, token público único e cancelamento pelo cliente | **3/3 PASS** |
| **Fase 6: Webhooks & HMAC** | `tests/phase6_webhooks.test.js` | Assinatura HMAC-SHA256, segurança de chaves e isolamento por tenant | **3/3 PASS** |

### Execução dos Testes
```bash
npm test
```
**Resultado**: `31 tests passing (0 failures)`.
