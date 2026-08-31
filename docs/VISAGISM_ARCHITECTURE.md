# BarberFlow — Arquitetura de Visagismo (Mude seu visual)

## 1. Visão Geral
O módulo **Visagismo BarberFlow** foi desenvolvido para transformar o atendimento do cliente na barbearia, oferecendo recomendações personalizadas de cortes, barbas, estilos e cores com **zero custo de inteligência artificial (zero API token cost)** e total conformidade com a LGPD.

---

## 2. Diagrama de Arquitetura

```
[Cliente WhatsApp]
       │
       ▼ (Opção 6 ou "Quero mudar visual")
[WhatsApp Engine / WAHA]
       │
       ▼ (Gera token efêmero de 24h)
[VisagismSession] ───► Link seguro: /visagismo/session/[token]
       │
       ▼
[Mobile UI (Next.js React)]
       ├─ Passo 1: Boas-vindas
       ├─ Passo 2: Foto de Selfie + Consentimento LGPD
       ├─ Passo 3: Questionário de 5 Preferências
       ├─ Passo 4: Formato de Rosto (Guia + "Não sei")
       ├─ Passo 5: Cores & Tonalidades
       └─ Passo 6: Resultado "Meu Novo Visual"
              ├─ Top 3 Recomendações Ranqueadas
              ├─ Agendamento Direto (/b/[slug])
              └─ Enviar ao Barbeiro via WhatsApp (wa.me)
```

---

## 3. Componentes do Sistema

### 3.1 Motor Determinístico (`DeterministicVisagismProvider`)
- **Implementação**: Algoritmo ponderado por regras visagistas.
- **Score (0 a 100)**:
  - Formato de rosto vs. geometria do corte (+25 pts).
  - Estilo preferido (+20 pts).
  - Tempo de manutenção diária (+15 pts).
  - Preservação do comprimento dos fios (+15 pts).
  - Impacto da mudança (+15 pts).
- **Provedor Agnóstico**: Interface `VisagismAIProvider` pronta para plugar modelos locais ou de visão no futuro sem alterar o frontend ou o core.

### 3.2 Catálogo Estruturado (`src/lib/visagism/catalog.ts`)
- **18 Cortes**: Low Fade, Mid Fade, High Fade, Skin Fade, Taper Fade, Buzz Cut, Crew Cut, French Crop, Textured Crop, Pompadour, Quiff, Slick Back, Side Part, Corte Social, Executivo, Longo em Camadas, Curly High Top, Medium Flow.
- **8 Estilos de Barba**: Por Fazer, Short Boxed, Cheia, Desenhada em Fade, Cavanhaque, Bigode Chevron, Curta com Degradê, Rosto Liso.
- **8 Tonalidades/Cores**: Natural, Castanho Escuro, Castanho Claro, Loiro/Mechas, Platinado, Grisalho Matizado, Colorido Fantasia.

### 3.3 Banco de Dados & Multi-Tenancy
- Todas as tabelas possuem índice e chave estrangeira obrigatória para `Barbershop`.
- `VisagismSession`: Sessões com `publicToken` criptográfico e expiração de 24h.
- `VisagismProfile`: Respostas das preferências e formato de rosto.
- `VisagismRecommendation`: Recomendações geradas com score e justificativa.
- `VisagismMetric`: Funil de conversão isolado por tenant.
