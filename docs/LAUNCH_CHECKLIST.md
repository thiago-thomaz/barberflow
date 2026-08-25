# Checklist de Lançamento Comercial — BarberFlow

Este checklist define todas as etapas obrigatórias que o operador deve executar antes de liberar o link de acesso aos primeiros clientes pagantes.

---

## 1. Infraestrutura & Servidor (Coolify / VPS)
- [ ] Criar projeto e aplicação no Coolify apontando para o repositório GitHub.
- [ ] Configurar variáveis de ambiente de produção no Coolify:
  - `DATABASE_URL` (PostgreSQL com SSL)
  - `JWT_SECRET` (gerado via `openssl rand -base64 32`)
  - `NEXT_PUBLIC_APP_URL` (`https://app.barberflow.com.br`)
  - `NODE_ENV=production`
  - `PAYMENT_WEBHOOK_SECRET`
- [ ] Executar primeira migração no banco de produção:
  ```bash
  npx prisma migrate deploy
  ```
- [ ] Configurar DNS (Tipo A apontando para o IP do VPS) e habilitar Let's Encrypt SSL automático.
- [ ] Validar probe de saúde: `curl -I https://app.barberflow.com.br/api/health`.

---

## 2. Backup & Resiliência
- [ ] Configurar rotina diária no Cron do servidor:
  ```cron
  0 3 * * * cd /app/barberflow && node scripts/backup.js >> /var/log/barberflow_backup.log 2>&1
  ```
- [ ] Configurar sincronização do diretório `/app/barberflow/backups` para bucket S3 / Cloudflare R2 via `rclone` ou `aws s3 sync`.

---

## 3. Integrações & Comunicação
- [ ] **E-mail Transacional**: Inserir credenciais SMTP ou chave Resend para envio real de links de recuperação de senha.
- [ ] **n8n / WhatsApp**:
  - Criar webhook no n8n recebendo eventos do BarberFlow.
  - Cadastrar URL do webhook na tela `/automacoes` do BarberFlow e salvar a chave secreta HMAC.
  - Conectar instância Evolution API / Z-API para envio de mensagens automáticas.

---

## 4. Pagamentos & Monetização
- [ ] Cadastrar conta em Gateway de Pagamento (Stripe / Asaas / Mercado Pago).
- [ ] Cadastrar URL de webhook `https://app.barberflow.com.br/api/subscription/webhook` no painel do gateway com a chave `PAYMENT_WEBHOOK_SECRET`.
- [ ] Realizar 1 pagamento de teste em modo Sandbox.

---

## 5. Jurídico & Conformidade
- [x] Páginas `/termos` e `/privacidade` publicadas.
- [ ] Revisão final dos termos de uso por assessoria jurídica.
