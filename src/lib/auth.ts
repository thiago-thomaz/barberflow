import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { prisma } from './prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'barberflow-secure-jwt-secret-key-production';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  barbershopId: string | null;
  barbershopName?: string;
  barbershopSlug?: string;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<TokenPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('barberflow_token')?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function getSessionFromRequest(req: NextRequest): TokenPayload | null {
  const cookieToken = req.cookies.get('barberflow_token')?.value;
  if (cookieToken) {
    const verified = verifyToken(cookieToken);
    if (verified) return verified;
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return verifyToken(token);
  }

  return null;
}

export async function requireAuth(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  if (!session.barbershopId) {
    throw new Error('NO_TENANT');
  }
  return session;
}

export function isSuperAdmin(session: TokenPayload | null): boolean {
  return session?.role === 'SUPER_ADMIN';
}

export async function requireSuperAdmin(req: NextRequest) {
  const session = getSessionFromRequest(req);
  if (!session) {
    throw new Error('UNAUTHORIZED');
  }
  if (session.role !== 'SUPER_ADMIN') {
    throw new Error('FORBIDDEN');
  }

  // Database verification to prevent stale/tampered tokens
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user || user.role !== 'SUPER_ADMIN') {
    throw new Error('FORBIDDEN');
  }

  return { session, user };
}

export async function logAdminAuditEvent({
  adminUserId,
  action,
  entity,
  entityId,
  tenantId,
  metadata,
  req,
}: {
  adminUserId: string;
  action: 'LOGIN' | 'LOGOUT' | 'SUSPEND_TENANT' | 'REACTIVATE_TENANT' | 'CHANGE_PLAN' | 'UPDATE_USER' | 'CREATE_PLAN' | 'UPDATE_PLAN' | 'RECORD_PAYMENT' | 'IMPERSONATE' | 'CONFIG_UPDATE' | string;
  entity: 'Barbershop' | 'User' | 'Plan' | 'Subscription' | 'SaaSPayment' | 'SaaSSetting' | string;
  entityId?: string | null;
  tenantId?: string | null;
  metadata?: Record<string, any> | null;
  req?: NextRequest | null;
}) {
  try {
    let ipAddress: string | null = null;
    let userAgent: string | null = null;

    if (req) {
      ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || null;
      userAgent = req.headers.get('user-agent') || null;
    }

    // Sanitize metadata to guarantee NO secrets/passwords/tokens are saved
    const safeMeta = metadata ? { ...metadata } : null;
    if (safeMeta) {
      delete safeMeta.password;
      delete safeMeta.passwordHash;
      delete safeMeta.token;
      delete safeMeta.tokenHash;
      delete safeMeta.apiKey;
      delete safeMeta.secret;
    }

    return await prisma.adminAuditLog.create({
      data: {
        adminUserId,
        action,
        entity,
        entityId: entityId || null,
        tenantId: tenantId || null,
        metadata: safeMeta ? JSON.stringify(safeMeta) : null,
        ipAddress,
        userAgent,
      },
    });
  } catch (err) {
    console.error('[AdminAuditLog] Error logging administrative action:', err);
  }
}

