# Diretrizes de Arquitetura e Blindagem — BarberFlow

## 1. Confinamento de Workspace & Isolamento Estrito
- **Isolamento de Diretório**: É TERMINANTEMENTE PROIBIDO a qualquer agente ler, alterar, criar, executar comandos ou deletar arquivos fora da raiz deste projeto (`c:\Users\Thiago Thomaz\OneDrive\Documentos\AntiGravity - Projetos\Barbearia`).
- **Proibição de Cruzamento de Projetos**: É expressamente proibido acessar, alterar ou interagir com diretórios-irmãos contidos em `AntiGravity - Projetos` (o projeto "Arena Play" é 100% blindado e isolado, assim como quaisquer outros).
- **Escopo 100% Local e Fechado**:
  - Variáveis de ambiente e segredos pertencem exclusivamente a este projeto.
  - Processos de desenvolvimento (`next dev`, portas 3000/porta padrão local), background workers (`worker:reminders`), instâncias de banco (SQLite local `prisma/dev.db`) e suítes de teste são estritamente confinadas a este workspace.
  - Zero compartilhamento de portas, caches, processos daemon ou daemons externos com outros projetos.

## 2. Zero Dependência Externa do n8n
- **Proibição Absoluta**: Nenhuma funcionalidade do BarberFlow deve depender de workflows, webhooks intermediários ou schedules do n8n.
- **Inbound WhatsApp**: O WAHA (ou Meta Cloud API) envia webhooks diretamente para a rota interna `/api/webhooks/whatsapp`. A rota trata nativamente payloads diretos do WAHA (incluindo filtro de mensagens `fromMe`, extração de mídia, mensagens de texto e áudio).
- **Outbound WhatsApp & Notificações**: Todas as notificações (`sendNotification`) são despachadas diretamente pelo motor interno do WhatsApp (`getWhatsAppProvider().sendText(...)`), sem intermediários.
- **Lembretes e Agendamentos Periódicos (T-24h, T-6h, T-2h, T-1h)**:
  - Processados pelo scheduler interno autônomo (`src/lib/scheduler.ts`), inicializado no boot do Next.js via `src/instrumentation.ts`.
  - Script autônomo alternativo: `node scripts/internal-scheduler.js` (`npm run worker:reminders`).
  - Endpoint de fallback interno: `POST /api/internal/reminders/due`.
- **Motor de Recorrência & Churn**:
  - Avaliação de clientes em risco (`CUSTOMER_AT_RISK`) e inativos (`CUSTOMER_INACTIVE`) executada no próprio banco de dados SQLite/Prisma e despachada diretamente.
