# Guia de Deploy & Produção — BarberFlow

O BarberFlow está preparado para rodar tanto via Docker quanto em VPS tradicional ou plataformas como Coolify, Railway, Vercel ou Dokku.

---

## 1. Deploy com Docker Compose (Recomendado)

### 1.1. Pré-requisitos
- Docker Engine $\ge 20.10$
- Docker Compose $\ge 2.0$

### 1.2. Passos de Instalação
1. Clone o repositório no servidor:
```bash
git clone https://github.com/seu-usuario/barberflow.git
cd barberflow
```

2. Configure o arquivo `.env`:
```env
DATABASE_URL=postgresql://barberflow:barberflow_secret@postgres:5432/barberflow_db?schema=public
JWT_SECRET=gere_uma_chave_longa_e_segura_aqui_exemplo_32_bytes
NEXT_PUBLIC_APP_URL=https://app.barbearia.com.br
NODE_ENV=production
```

3. Inicie os containers:
```bash
docker compose up -d --build
```

4. Execute as migrações do banco e seed inicial:
```bash
docker compose exec app npx prisma db push
docker compose exec app node prisma/seed.js
```

---

## 2. Deploy Manual / Bare Metal (Node.js + PostgreSQL)

```bash
# 1. Instalar dependências
npm ci

# 2. Gerar Prisma Client e migrar banco
npx prisma generate
npx prisma db push

# 3. Rodar seed inicial (opcional)
node prisma/seed.js

# 4. Build de produção
npm run build

# 5. Iniciar servidor com PM2
pm2 start npm --name "barberflow" -- start
```
