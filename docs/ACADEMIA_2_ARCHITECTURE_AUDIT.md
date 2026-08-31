# BarberFlow — Academia 2.0 Architecture Audit (Fase 16)

Data da Auditoria: 31/08/2026
Objetivo: Mapeamento detalhado da arquitetura existente da Academia BarberFlow antes da introdução do Diagnóstico Inteligente e Plano de Ação.

---

## 1. Componentes Existentes da Academia

| Componente | Arquivo / Rota | Estado Atual | Propósito |
| :--- | :--- | :--- | :--- |
| **Catálogo de Conteúdos** | `src/lib/academia/content.ts` | 80 conteúdos auditados (Fase 15), 100% URLs válidas | Base de conhecimento e cursos oficiais |
| **Ferramentas & Checklists** | `src/lib/academia/tools.ts` | 12 calculadoras, 8 geradores, 9 checklists | Ferramentas práticas para a barbearia |
| **Consultor IA BarberFlow** | `src/lib/academia/ai-consultant.ts` | Motor determinístico em 5 blocos | Consultoria determinística sem custos de IA |
| **Métricas do Tenant** | `src/app/api/academia/metrics-summary/route.ts` | Agregação read-only | Fornece dados reais para o consultor |
| **Persistência de Progresso** | `src/app/api/academia/progress/route.ts` | Modelo `EducationProgress` | Rastreia conclusão por usuário/tenant |
| **Persistência de Favoritos** | `src/app/api/academia/favorite/route.ts` | Modelo `EducationFavorite` | Rastreia itens favoritados |
| **Histórico de Consultas** | `src/app/api/academia/ia/history/route.ts` | Modelo `EducationAiConsultation` | Histórico de perguntas e diagnósticos |
| **Interface Principal** | `src/app/academia/page.tsx` | UI com busca, filtros e trilhas | Hub de acesso da Academia |
| **Interface Ferramentas** | `src/app/academia/ferramentas/page.tsx` | Calculadoras e geradores interativos | Execução no cliente com exportação |
| **Interface Consultor** | `src/app/academia/ia/page.tsx` | Chat consultivo estruturado | Consulta rápida e histórico |

---

## 2. Modelos Prisma Existentes para Educação

```prisma
model EducationProgress {
  id           String     @id @default(cuid())
  userId       String
  barbershopId String
  contentId    String
  isCompleted  Boolean    @default(true)
  completedAt  DateTime   @default(now())
  barbershop   Barbershop @relation(fields: [barbershopId], references: [id], onDelete: Cascade)
  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, contentId])
  @@index([barbershopId])
  @@index([userId])
}

model EducationFavorite {
  id           String     @id @default(cuid())
  userId       String
  barbershopId String
  contentId    String
  createdAt    DateTime   @default(now())
  barbershop   Barbershop @relation(fields: [barbershopId], references: [id], onDelete: Cascade)
  user         User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, contentId])
  @@index([barbershopId])
  @@index([userId])
}

model EducationAiConsultation {
  id                  String     @id @default(cuid())
  userId              String
  barbershopId        String
  question            String
  topic               String?
  diagnosis           String?
  recommendation      String?
  actionPlanJson      String?
  metric              String?
  disclaimer          String?
  responseTimeMs      Int?
  modelUsed           String     @default("DETERMINISTIC_RULES_ENGINE")
  createdAt           DateTime   @default(now())
  barbershop          Barbershop @relation(fields: [barbershopId], references: [id], onDelete: Cascade)
  user                User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([barbershopId])
  @@index([userId])
}
```

---

## 3. Integração com Dados Reais do BarberFlow

A barbearia possui dados consolidados em:
1. `Appointment`: Agendamentos, datas, preços, status (`CONCLUIDO`, `CONFIRMADO`, `CANCELADO`).
2. `Customer`: Clientes cadastrados, histórico de visitas, cálculo de inatividade (> 35 dias).
3. `Barber`: Barbeiros ativos, cálculo de capacidade produtiva e comissões.
4. `FinancialTransaction`: Receitas realizadas, despesas pagas, contas a pagar e a receber com vencimentos futuros.
5. `FinancialRecurringRule`: Custos fixos recorrentes (aluguel, água, energia, sistemas).
6. `MoneyOnTheTableRecovery`: Clientes com risco de perda identificados pelo motor de recorrência.

---

## 4. Oportunidades Identificadas para a Fase 16 (Academia 2.0)

1. **Questionário de Diagnóstico Guiado (15 perguntas)**: Permite ao gestor responder e ao mesmo tempo puxar automaticamente dados reais já registrados no sistema.
2. **Score de Saúde (0 a 100)**: Ponderação determinística em 6 pilares de gestão (Ocupação, Retenção, Ticket, Margem/Despesas, Fluxo de Caixa e Metas).
3. **Widget "🎯 O que fazer hoje"**: Apresentação de até 3 prioridades críticas diárias com links diretos de ação dentro do sistema.
4. **Plano de Ação Kanban/Lista (`/academia/plano`)**: Gestão de tarefas com status `PENDENTE`, `EM_ANDAMENTO`, `CONCLUIDO` e recomendações diretas dos 80 links oficiais da Academia.
5. **Zero Custos e 100% Determinístico**: Garantia estrita de funcionamento sem qualquer API externa paga.
6. **Multi-Tenancy e Isolamento Rigoroso**: Dados de diagnóstico e planos de ação estritamente isolados por `barbershopId`.
