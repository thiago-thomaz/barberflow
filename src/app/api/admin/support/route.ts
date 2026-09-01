import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin(req);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      pastDueSubscriptions,
      expiredSubscriptions,
      failedNotifications,
      inactiveTenants,
      recentErrors,
    ] = await Promise.all([
      prisma.subscription.findMany({
        where: { status: 'PAST_DUE' },
        include: { barbershop: true, plan: true },
      }),
      prisma.subscription.findMany({
        where: { status: 'EXPIRED' },
        include: { barbershop: true, plan: true },
      }),
      prisma.notification.findMany({
        where: { status: 'FAILED' },
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { barbershop: { select: { name: true, slug: true } } },
      }),
      prisma.barbershop.findMany({
        where: { isActive: false },
        include: {
          users: { where: { role: 'OWNER' }, select: { name: true, email: true } },
          subscriptions: { include: { plan: true }, take: 1 },
        },
      }),
      prisma.adminAuditLog.findMany({
        where: { action: { contains: 'SUSPEND' } },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { tenant: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          pastDueCount: pastDueSubscriptions.length,
          expiredCount: expiredSubscriptions.length,
          failedNotificationCount: failedNotifications.length,
          inactiveTenantCount: inactiveTenants.length,
        },
        pastDueSubscriptions,
        expiredSubscriptions,
        failedNotifications,
        inactiveTenants,
        recentErrors,
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Acesso restrito ao Super Admin' }, { status: 403 });
    }
    console.error('[AdminSupport API Error]:', error);
    return NextResponse.json({ error: 'Erro ao carregar dados de suporte' }, { status: 500 });
  }
}
