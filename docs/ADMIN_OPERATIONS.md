# ⚙️ Guia Operacional do SaaS BarberFlow (Fase 20)

## 1. Rotinas Administrativas

### 1.1. Suspensão e Reativação de Barbearias (Tenants)
- **Onde:** Menu **Barbearias** (`/admin/barbearias`) ou na **Visão 360º** (`/admin/barbearias/[id]`).
- **Como Funciona:**
  - Clique no botão de **Suspender** / **Reativar**.
  - O modal exigirá a justificativa do operador (ex: *Inadimplência há mais de 15 dias* ou *Solicitação do cliente*).
  - Em suspensão, o sistema bloqueia os agendamentos públicos (`/b/[slug]`) e o acesso dos barbeiros e donos aos painéis internos.

### 1.2. Criação e Ajuste de Planos de Assinatura
- **Onde:** Menu **Planos** (`/admin/planos`).
- **Parâmetros Configuráveis:**
  - Nome do plano e código do Tier (`STARTER`, `PRO`, `BUSINESS`, `ENTERPRISE`).
  - Preço em Reais (R$) e ciclo de faturamento.
  - Limite de profissionais/barbeiros cadastráveis.
  - Limite de agendamentos mensais.
  - Flags de WhatsApp e Relatórios Financeiros Avançados.

### 1.3. Gestão de Faturamento & Pagamentos
- **Onde:** Menu **Pagamentos** (`/admin/pagamentos`).
- **Registro Manual:**
  - Permite ao operador registrar pagamentos recebidos via PIX direto, boleto ou cartão.
  - Automaticamente altera o status da assinatura de `PAST_DUE` para `ACTIVE` se a conta estiver inadimplente.

### 1.4. Monitoramento da Infraestrutura
- **Onde:** Menu **Saúde da Plataforma** (`/admin/saude`).
- **Serviços Monitorados:**
  - Aplicação Next.js (Uptime, versão do Node, consumo de memória Heap/RSS).
  - Banco de Dados SQLite (Latência de query SQL em ms, contagem de tabelas).
  - WhatsApp WAHA (Status da sessão `default`, latência do endpoint HTTP).
  - Barramento de Automações n8n (Verificação de integridade HMAC-SHA256).
