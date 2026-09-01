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
 * Resolves the destination route after successful authentication based on the user's role.
 * SUPER_ADMIN -> /admin
 * OWNER / BARBER / RECEPTIONIST -> /dashboard
 */
export function getPostLoginRedirect(user: AuthUser | null | undefined): string {
  if (!user) {
    return '/dashboard';
  }

  if (user.role === 'SUPER_ADMIN') {
    return '/admin';
  }

  return '/dashboard';
}
