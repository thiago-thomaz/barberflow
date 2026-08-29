# 🔐 BarberFlow — Central de Credenciais & Configurações de Produção

> **Aviso:** Guarde este arquivo em local seguro. Contém os acessos integrais aos servidores e serviços do ecossistema BarberFlow.

---

## 1. 🖥️ Servidor VPS (Hostinger)
- **IP do Servidor:** `72.62.13.62`
- **Usuário:** `root`
- **Senha SSH:** `Temp181285-().&@?'#`
- **Porta SSH:** `22`
- **Sistema Operacional:** Ubuntu 24.04 LTS x86_64

---

## 2. 🚀 Coolify (Painel de Deploy & Infraestrutura)
- **URL do Painel:** `http://72.62.13.62:8000` / `https://coolify.srv1194775.hstgr.cloud`
- **Aplicação Principal:** `BarberFlow Next.js` (UUID: `7ho00pvb569n5m3jgee0fnsi`)
- **Domínio de Produção:** `https://barber.projetosunion.cloud`
- **WAHA Service UUID:** `kfqib7khsae0hnnurptry6bu`
- **Coolify Database:** PostgreSQL local no container `coolify-db`

---

## 3. 📱 WAHA — WhatsApp HTTP API Engine
- **URL Base:** `https://evo.projetosunion.cloud`
- **Dashboard Web:** `https://evo.projetosunion.cloud/dashboard/`
- **API Key Permanente:** `bf_waha_sec_9e06180371424a1b80c355fb5dc21182`
- **Sessão Padrão:** `default`
- **Número Conectado:** `+55 14 98801-6163` (`5514988016163@c.us`)
- **Status da Sessão:** `WORKING`

---

## 4. ⚡ n8n Workflow Automation
- **URL do Painel:** `https://n8n.srv1194775.hstgr.cloud`
- **Workflow Inbound (Orquestrador WAHA):** `YRQYwN7VvEwlPY8C` (`[BARBERFLOW] - WAHA Inbound & Conversational Orchestrator`)
- **Webhook Inbound URL:** `https://n8n.srv1194775.hstgr.cloud/webhook/barberflow-waha-inbound`
- **Workflow de Lembretes:** `JqrqRlyMlEcnoWLO` (`[BARBERFLOW] - Appointment Reminders Engine`)

---

## 5. 🗄️ Banco de Dados (SQLite de Produção)
- **Caminho no Container:** `/app/prisma/dev.db`
- **Volume Persistente:** `/data/coolify/applications/7ho00pvb569n5m3jgee0fnsi/`
- **Tenant Principal (Loja):** `Barber Shop`
- **Tenant Slug:** `barber-shop`
- **Telefone da Barbearia:** `14988016163`
- **Barbeiro Cadastrado:** `Thiago Thomaz` (`14997281694`)

---

## 6. 🌐 Variáveis de Ambiente de Produção (`.env.production`)
```env
NODE_ENV="production"
PORT="3000"
DATABASE_URL="file:/app/prisma/dev.db"
JWT_SECRET="super-secret-barberflow-jwt-key-change-in-production-32bytes"
NEXTAUTH_SECRET="super-secret-barberflow-jwt-key-change-in-production-32bytes"
NEXTAUTH_URL="https://barber.projetosunion.cloud"

# Integração WAHA WhatsApp
WAHA_URL="https://evo.projetosunion.cloud"
WAHA_API_KEY="bf_waha_sec_9e06180371424a1b80c355fb5dc21182"
WAHA_DEFAULT_SESSION="default"
WHATSAPP_PROVIDER="WAHA"
```
