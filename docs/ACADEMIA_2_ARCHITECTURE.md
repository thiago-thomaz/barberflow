# BarberFlow — Academia 2.0 Architecture (Fase 16)

## 1. Visão Geral
A Academia 2.0 evolui o módulo educacional do BarberFlow de um catálogo estático de cursos para um **Consultor de Gestão da Barbearia** inteligente e determinístico.
O sistema combina dados reais da operação com heurísticas financeiras e de ocupação para fornecer:
- Diagnóstico automático e Score de Saúde da Barbearia (0 a 100).
- Painel diário "🎯 O que fazer hoje" com até 3 prioridades acionáveis.
- Plano de Ação estruturado com tarefas, prazos, indicadores mensuráveis e links para ferramentas e conteúdos oficiais validados.
- Consultor BarberFlow orientado a dados com zero custos de API.

---

## 2. Diagrama de Arquitetura

```mermaid
graph TD
    A[Gestor / Usuário Autenticado] --> B[Interface Academia 2.0]
    B --> C[/academia/diagnostico]
    B --> D[/academia/plano]
    B --> E[/academia/ia]
    B --> F[/academia/ferramentas]
    
    C & D & E --> G[API Layer /api/academia/*]
    G --> H[Motor Determinístico diagnostic-engine.ts]
    
    H --> I[(Prisma SQLite / Postgres)]
    I --> J[Appointment / Customer / FinancialTransaction]
    I --> K[AcademyDiagnostic / AcademyActionPlan]
    
    H --> L[Catálogo Oficial 80 Conteúdos content.ts]
    H --> M[12 Calculadoras & 9 Checklists tools.ts]
```

---

## 3. Entidades do Banco de Dados

### 3.1 `AcademyDiagnostic`
Armazena as avaliações de diagnóstico executadas para o tenant:
- `id`: Identificador único (CUID).
- `barbershopId`: Identificador da barbearia (Multi-Tenancy).
- `userId`: Dono ou gestor que executou a avaliação.
- `answersJson`: Respostas dadas às 15 perguntas.
- `realMetricsJson`: Snapshot das métricas reais apuradas no momento.
- `healthScore`: Score de 0 a 100.
- `healthCategory`: `EXCELENTE` (80-100), `SAUDAVEL` (60-79), `ATENCAO` (40-59), `CRITICO` (0-39), `DADOS_INSUFICIENTES`.
- `prioritiesJson`: Top 3 prioridades diárias ("🎯 O que fazer hoje").
- `biggestProblem`: Maior gargalo apontado pelo gestor ou identificado pelo motor.
- `missingDataJson`: Detalhamento de dados ausentes se aplicável.
- `status`: `COMPLETED`.

### 3.2 `AcademyActionPlan`
Tarefas estratégicas acionáveis:
- `id`: Identificador único.
- `barbershopId`: Isolamento de tenant.
- `userId`: Responsável.
- `diagnosticId`: Vínculo opcional com a avaliação.
- `title`, `problem`, `whyItMatters`, `action`, `howTo`.
- `deadlineDays` / `targetDeadline`: Prazos de execução.
- `indicator`: Métrica de sucesso (ex: "+15 agendamentos", "Elevar ticket para R$ 55").
- `recommendedCategory`, `recommendedContentIds`, `recommendedToolId`, `recommendedChecklistId`.
- `status`: `PENDENTE` | `EM_ANDAMENTO` | `CONCLUIDO`.
- `completedAt`: Timestamp de conclusão.

### 3.3 `AcademyDiagnosticSnapshot`
Histórico temporal para gráficos de evolução do score do tenant ao longo do tempo.
