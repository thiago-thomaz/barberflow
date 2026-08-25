# Política e Diretrizes de Segurança — BarberFlow

O BarberFlow adota práticas rígidas de segurança defensiva em todas as camadas da aplicação SaaS.

---

## 1. Proteção de Credenciais & Segredos
- **Zero Plaintext Passwords**: Todas as senhas de usuários utilizam hash bcrypt com 10 rounds de salt.
- **Redação Automática de Logs**: O logger interno sanitiza recursivamente chaves como `password`, `token`, `secret`, `authorization`, `creditcard` antes de escrever qualquer log.
- **Cookies HTTP-Only & Secure**: O cookie de sessão `barberflow_token` é inacessível via JavaScript client-side (proteção contra XSS) e transmitido somente via HTTPS em produção.

---

## 2. Prevenção de Ataques Comuns

### 2.1. Broken Access Control & IDOR (Insecure Direct Object References)
- Todas as consultas e mutações no banco de dados (`findFirst`, `update`, `delete`) validam o `barbershopId` associado ao usuário logado na sessão JWT.
- Tentativas de acesso horizontal entre tenants diferentes retornam `404 Not Found` ou `403 Forbidden`.

### 2.2. Rate Limiting & Proteção contra Brute Force / Spam
- **Login (`/api/auth/login`)**: Máximo de 5 tentativas por 15 minutos.
- **Agendamento Público (`/api/public/[slug]/book`)**: Limite de requisições por IP e cooldown por telefone.
- **Recuperação de Senha (`/api/auth/forgot-password`)**: Resposta uniforme independente do e-mail existir (anti-enumeração de usuários).

### 2.3. Assinatura de Webhooks HMAC-SHA256
- Todas as mensagens enviadas para instâncias n8n possuem cabeçalho `X-BarberFlow-Signature` e `X-BarberFlow-Timestamp`, permitindo validação estrita de autenticidade e proteção contra replay attacks.
