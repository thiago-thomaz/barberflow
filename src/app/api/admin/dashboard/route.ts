import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin(req);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [
      totalTenants,
      activeTenants,
      inactiveTenants,
      newTenantsToday,
      newTenants7d,
      newTenants30d,
      newTenantsThisMonth,
      newTenantsLastMonth,
      subscriptions,
      saasPayments,
      totalCustomers,
      totalAppointments,
      totalUsers,
      recentAuditLogs,
      recentBarbershops,
    ] = await Promise.all([
      prisma.barbershop.count(),
      prisma.barbershop.count({ where: { isActive: true } }),
      prisma.barbershop.count({ where: { isActive: false } }),
      prisma.barbershop.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.barbershop.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.barbershop.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.barbershop.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.barbershop.count({ where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
      prisma.subscription.findMany({ include: { plan: true } }),
      prisma.saaSPayment.findMany({ where: { status: 'PAID' } }),
      prisma.customer.count({ where: { deletedAt: null } }),
      prisma.appointment.count(),
      prisma.user.count(),
      prisma.adminAuditLog.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { adminUser: { select: { name: true, email: true } }, tenant: { select: { name: true, slug: true } } },
      }),
      prisma.barbershop.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { subscriptions: { include: { plan: true } }, _count: { select: { appointments: true, customers: true, barbers: true } } },
      }),
    ]);

    // Subscriptions aggregation
    const activeSubs = subscriptions.filter((s) => s.status === 'ACTIVE');
    const trialSubs = subscriptions.filter((s) => s.status === 'TRIALING');
    const pastDueSubs = subscriptions.filter((s) => s.status === 'PAST_DUE');
    const cancelledSubs = subscriptions.filter((s) => s.status === 'CANCELLED');
    const expiredSubs = subscriptions.filter((s) => s.status === 'EXPIRED');

    // Revenue calculations
    const mrr = activeSubs.reduce((acc, s) => acc + (s.plan?.price || 0), 0);
    const arr = mrr * 12;
    const totalCollectedRevenue = saasPayments.reduce((acc, p) => acc + p.amount, 0);

    const pastDueAmount = pastDueSubs.reduce((acc, s) => acc + (s.plan?.price || 0), 0);
    const arpu = activeSubs.length > 0 ? mrr / activeSubs.length : 0;
    const churnRate = subscriptions.length > 0 ? (cancelledSubs.length / subscriptions.length) * 100 : 0;
    const retentionRate = subscriptions.length > 0 ? (activeSubs.length / subscriptions.length) * 100 : 0;

    return NextResponse.json({
      success: true,
      data: {
        tenants: {
          total: totalTenants,
          active: activeTenants,
          inactive: inactiveTenants,
          growth: {
            today: newTenantsToday,
            sevenDays: newTenants7d,
            thirtyDays: newTenants30d,
            thisMonth: newTenantsThisMonth,
            lastMonth: newTenantsLastMonth,
          },
        },
        financial: {
          mrr,
          arr,
          arpu,
          totalCollectedRevenue,
          pastDueAmount,
        },
        subscriptions: {
          total: subscriptions.length,
          active: activeSubs.length,
          trialing: trialSubs.length,
          pastDue: pastDueSubs.length,
          cancelled: cancelledSubs.length,
          expired: expiredSubs.length,
          churnRate: Math.round(churnRate * 10) / 10,
          retentionRate: Math.round(retentionRate * 10) / 10,
        },
        operation: {
          totalCustomers,
          totalAppointments,
          totalUsers,
        },
        recentAuditLogs,
        recentBarbershops,
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Acesso restrito ao Super Admin' }, { status: 403 });
    }
    console.error('[AdminDashboard API Error]:', error);
    return NextResponse.json({ error: 'Erro ao carregar dados do dashboard executivo' }, { status: 500 });
  }
}
