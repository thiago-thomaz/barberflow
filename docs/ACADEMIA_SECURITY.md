# Segurança, Privacidade e Multi-Tenancy — Academia BarberFlow

## 1. Isolamento Estrito de Dados (Multi-Tenancy)
- Cada interação de progresso educacional (`EducationProgress`), item favoritado (`EducationFavorite`) e registro de consulta (`EducationAiConsultation`) é vinculada estritamente ao `barbershopId` e `userId` da sessão autenticada.
- Não existem endpoints públicos que exponham dados de consultas de IA ou progresso de terceiros.

---

## 2. Acesso à Inteligência Artificial e Agregações
- **Nenhum Acesso a SQL Arbitrário:** O Consultor BarberFlow não recebe conexões diretas nem executa queries dinâmicas informadas pelo usuário.
- **Leitura Segura de Indicadores:** O endpoint `/api/academia/metrics-summary` expõe exclusivamente dados consolidados (médias e contagens) da barbearia do usuário autenticado.
- **Proteção contra Cross-Tenant Leakage:** Todo filtro de banco inclui explicitamente `where: { barbershopId: session.barbershopId }`.

---

## 3. Disclaimers de Responsabilidade
- Consultas relativas a MEI, impostos, CNAE, contratos de parceiros ou saúde possuem anexação compulsória de aviso legal/tributário:
  > *"Aviso Legal/Tributário: Este conteúdo possui finalidade estritamente educacional e informativa. Não substitui a orientação formal de um contador registrado no CRC ou advogado."*
