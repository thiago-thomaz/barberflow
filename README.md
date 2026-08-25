# 💈 BarberFlow — SaaS para Barbearias: Agenda, Clientes e Recorrência

O **BarberFlow** é uma plataforma SaaS multitenant projetada especificamente para barbearias modernas. O sistema vai além de uma simples agenda: ele calcula individualmente os ciclos de retorno dos clientes, alerta sobre clientes em risco de sumir e calcula o **"Dinheiro Deixado na Mesa"**, transformando o software em um motor de receita para a barbearia.

---

## 🚀 Principais Módulos e Funcionalidades

- **📅 Agenda Visual Interativa**: Visualização por Dia e Semana, ciclo de vida completo (`AGENDADO` → `CONFIRMADO` → `EM_ATENDIMENTO` → `CONCLUIDO` / `CANCELADO` / `NO_SHOW`), criação inline de clientes e snapshots imutáveis de preços.
- **🛡️ Motor Anti-Conflito Concorrente**: Validação rigorosa de sobreposição de horários no backend com isolamento serializável contra concorrência e double-booking.
- **🔥 Motor de Recorrência & "Dinheiro Deixado na Mesa"**:
  - Mediana e média matemática individual do ciclo de corte de cada cliente.
  - Classificação de clientes em `NOVO`, `ATIVO`, `EM_RISCO`, `INATIVO` e `VIP`.
  - Cálculo de receita potencial recuperável (*Revenue Opportunity*).
  - Tela de Reativação com mensagens amigáveis pré-geradas e disparo em 1-clique para o WhatsApp Web / App.
- **📊 Dashboard & Gestão Financeira**:
  - Faturamento Hoje (previsto vs realizado), Semana e Mês.
  - Ticket médio da barbearia.
  - Extrato de comissões por profissional e detalhamento por métodos de pagamento (PIX, Dinheiro, Cartão).
- **🌐 Página Pública de Agendamento (`/b/[slug]`)**:
  - Mobile-first, visual premium dark & gold.
  - Agendamento ágil em menos de 45 segundos sem exigir criação de conta pelo cliente.
  - QR Code para balcão da barbearia.
  - Gestão e cancelamento seguro pelo próprio cliente via `/agendamento/[token]`.
- **⚡ Automação com n8n & Webhooks**:
  - Disparo de eventos em tempo real (`APPOINTMENT_CREATED`, `CUSTOMER_AT_RISK`, etc.).
  - Assinatura criptográfica HMAC-SHA256 e teste de conexão em tempo real com medição de latência.
- **🏢 Arquitetura Multitenant Estrita**: Isolamento lógico de dados por tenant com autenticação JWT e senhas criptografadas em bcrypt.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend & Backend**: Next.js 14 (App Router, Server Components & Route Handlers), React 18, TypeScript, Tailwind CSS, Lucide Icons.
- **ORM & Banco de Dados**: Prisma ORM, PostgreSQL (produção) / SQLite (desenvolvimento).
- **Segurança**: JWT com cookies HTTP-only, senhas com salt bcrypt, assinaturas HMAC-SHA256.
- **DevOps**: Docker, Docker Compose, Next.js Standalone.

---

## ⚡ Instalação & Execução Local

1. **Clonar e instalar dependências**:
```bash
npm install
```

2. **Configurar variáveis de ambiente (`.env`)**:
```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="barberflow_jwt_secret_key_development_12345"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

3. **Gerar Prisma Client & Popular dados de demonstração (Seed)**:
```bash
npx prisma generate
npx prisma db push
node prisma/seed.js
```

4. **Executar em modo de desenvolvimento**:
```bash
npm run dev
```
Acesse em: [http://localhost:3000](http://localhost:3000)

### Credenciais de Acesso (Seed de Demonstração):
- **E-mail**: `dono@barbeariaimperial.com`
- **Senha**: `senha123barber`
- **Link Público**: [http://localhost:3000/b/barbearia-imperial](http://localhost:3000/b/barbearia-imperial)

---

## 🧪 Execução de Testes Automatizados

```bash
npm test
```
**31 testes automatizados cobrindo Core, Recorrência, Financeiro, Agendamento Público e Webhooks.**

---

## 🐳 Execução via Docker Compose

```bash
docker compose up -d --build
```

---

## 📚 Documentação Adicional

- [Arquitetura](docs/architecture.md)
- [Modelagem do Banco de Dados](docs/database.md)
- [Referência de APIs REST](docs/api.md)
- [Motor de Recorrência & Retenção](docs/recurrence-engine.md)
- [Integração n8n & Webhooks](docs/n8n.md)
- [Guia de Deploy](docs/deployment.md)
- [Garantia de Qualidade (QA)](docs/qa.md)
- [Relatório de QA Completo](QA_REPORT.md)
- [Relatório de Implementação](IMPLEMENTATION_REPORT.md)
