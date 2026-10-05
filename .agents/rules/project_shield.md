# Project Shield & Workspace Confinement — BarberFlow

## 1. Confinamento de Diretório
- Todo e qualquer agente de IA está confinado estritamente ao diretório raiz de BarberFlow (`c:\Users\Thiago Thomaz\OneDrive\Documentos\AntiGravity - Projetos\Barbearia`).
- É proibido executar operações de I/O (leitura, escrita, exclusão ou renomeação) fora desta raiz.
- É terminantemente proibido acessar projetos vizinhos dentro de `AntiGravity - Projetos` (como "Arena Play", que permanece blindado e inalcançável).

## 2. Isolamento de Processos, Portas e Ambiente
- **Ambiente**: O arquivo `.env` é de uso estritamente local e nunca deve ser exposto ou compartilhado.
- **Portas e Processos**: Processos de desenvolvimento (`next dev`), scripts de worker (`scripts/internal-scheduler.js`) e rotinas de build/teste executam com recursos locais isolados sem interferir em outras aplicações locais.
- **Bancos e Armazenamento**: O SQLite de desenvolvimento (`prisma/dev.db` e `storage/`) é mantido 100% isolado no escopo deste workspace.

## 3. Arquitetura Autônoma
- Nenhuma dependência externa de automação (n8n ou similares) é permitida. Todas as integrações e cron jobs são locais e nativos.
