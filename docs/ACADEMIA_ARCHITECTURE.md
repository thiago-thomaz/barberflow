# Arquitetura Técnica — Academia BarberFlow

## 1. Visão Geral
A **Academia BarberFlow** (`/academia`) é o módulo de capacitação, inteligência estratégica e ferramentas operacionais para donos de barbearia e equipes parceiras.

---

## 2. Princípios de Engenharia
- **Zero Impacto no Core:** Módulo 100% desacoplado. Não altera tabelas de agendamentos, clientes, regras financeiras, anti-conflito ou instâncias do WhatsApp.
- **Zero Custo de IA:** IA em 4 camadas que opera primariamente por motor determinístico baseado em regras de mercado e leitura autorizada de agregações.
- **Multi-Tenancy & Segurança:** Todo registro de progresso, favoritos e consultas pertence estritamente ao par `barbershopId` e `userId`.

---

## 3. Estrutura de Pastas e Componentes

```
src/
├── app/
│   ├── academia/
│   │   ├── page.tsx               # Hub Principal ("Netflix de Conhecimento")
│   │   ├── ferramentas/page.tsx   # 12 Calculadoras + 8 Geradores + 9 Checklists
│   │   └── ia/page.tsx            # Interface do Consultor BarberFlow
│   └── api/
│       └── academia/
│           ├── contents/route.ts          # Listagem, busca e filtros com status
│           ├── progress/route.ts          # Conclusão de itens
│           ├── favorite/route.ts          # Favoritar itens
│           ├── metrics-summary/route.ts   # Agregações somente-leitura do tenant
│           ├── ia/ask/route.ts            # Endpoint do Consultor IA
│           └── ia/history/route.ts        # Histórico de consultas
├── lib/
│   └── academia/
│       ├── content.ts             # Catálogo de 80+ recursos oficiais verificados
│       ├── tools.ts               # Lógica das 12 calculadoras, 8 geradores e 9 checklists
│       └── ai-consultant.ts       # Motor consultivo estruturado em 5 blocos
```

---

## 4. Modelagem de Dados Prisma

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
