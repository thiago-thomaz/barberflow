# FASE 21 — Guia de Autenticação e Roteamento Administrativo

## 1. Módulos e Funções Implementadas

### `src/lib/auth-client.ts`
Contém a função canônica de roteamento pós-login:
```typescript
export function getPostLoginRedirect(user: AuthUser | null | undefined): string {
  if (!user) return '/dashboard';
  if (user.role === 'SUPER_ADMIN') return '/admin';
  return '/dashboard';
}
```

### `src/middleware.ts`
Executa no Edge runtime do Next.js interceptando:
- `/admin/:path*`
- `/api/admin/:path*`

Decodifica tokens JWT e rejeita ou redireciona acessos não autorizados antes da execução de renderização.

### `src/app/login/page.tsx`
- Utiliza `getPostLoginRedirect` no login regular e no login demo.
- Verifica sessões ativas no `useEffect` inicial para redirecionamento imediato sem fricção.

---

## 2. Matriz de Perfis e Comportamento

| Role | Destino Pós-Login | Acesso a `/admin` | Acesso a `/dashboard` | Acesso a `/api/admin/*` |
| :--- | :--- | :--- | :--- | :--- |
| `SUPER_ADMIN` | `/admin` | ✅ Permitido | ✅ Permitido (Tenant Mode) | ✅ 200 OK |
| `OWNER` | `/dashboard` | ❌ Bloqueado (Tela Restrita) | ✅ Permitido | ❌ 403 Forbidden |
| `BARBER` | `/dashboard` | ❌ Bloqueado (Tela Restrita) | ✅ Permitido | ❌ 403 Forbidden |
| `RECEPTIONIST` | `/dashboard` | ❌ Bloqueado (Tela Restrita) | ✅ Permitido | ❌ 403 Forbidden |
| Não Autenticado | `/login` | ❌ Redirect `/login` | ❌ Redirect `/login` | ❌ 401 Unauthorized |
