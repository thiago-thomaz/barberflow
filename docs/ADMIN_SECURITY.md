# 🛡️ Diretrizes de Segurança do BarberFlow Admin (Fase 20)

## 1. Princípios de Segurança Imutáveis

1. **Autorização Estritamente no Servidor:**
   - O acesso a qualquer rota `/api/admin/*` é condicionado à execução da função `requireSuperAdmin(req)`.
   - NUNCA confiar em cabeçalhos manipuláveis, cookies de frontend, localStorage, ou parâmetros como `?admin=true`.

2. **Prevenção contra IDOR (Insecure Direct Object Reference):**
   - Todas as operações em barbearias, planos e usuários validam a existência e escopo dos recursos.
   - Um usuário com privilégio `OWNER` de uma barbearia específica não pode enviar requisições manipuladas para consultar ou alterar outros tenants.

3. **Sanitização de Metadados de Auditoria:**
   - A função `logAdminAuditEvent()` remove automaticamente chaves sensíveis dos metadados antes da gravação no banco:
     - `password`
     - `passwordHash`
     - `token`
     - `tokenHash`
     - `apiKey`
     - `secret`

4. **Proteção contra Auto-Demolição de Super Admins:**
   - O endpoint `/api/admin/users/[id]` impede que um Super Admin remova seus próprios privilégios se ele for o único operador ativo do sistema.

5. **Logs de Auditoria Imutáveis (`AdminAuditLog`):**
   - Registros de auditoria são `append-only`.
   - Não existem rotas de exclusão ou alteração de registros de auditoria no sistema.
