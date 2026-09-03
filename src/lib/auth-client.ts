/**
 * Shared Client-Side Authentication & Routing Helpers
 * Safe for use in Client Components ('use client') and Server files.
 */

export interface AuthUser {
  id?: string;
  name?: string;
  email?: string;
  role?: 'SUPER_ADMIN' | 'OWNER' | 'BARBER' | 'RECEPTIONIST' | string;
  barbershopId?: string | null;
  barbershop?: any;
}

/**
 * Resolves the destination route after successful authentication.
 * Standard login always redirects to the barbershop store dashboard (/dashboard).
 * /admin is only accessed directly via URL (e.g. /admin) or callbackUrl.
 */
export function getPostLoginRedirect(
  user?: AuthUser | null,
  callbackUrl?: string | null
): string {
  if (callbackUrl && callbackUrl.startsWith('/admin') && user?.role === 'SUPER_ADMIN') {
    return callbackUrl;
  }
  if (callbackUrl && !callbackUrl.startsWith('/admin')) {
    return callbackUrl;
  }
  return '/dashboard';
}
