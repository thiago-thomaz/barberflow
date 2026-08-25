import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/admin/metrics - SaaS master metrics (MRR, ARR, Tenants, Churn)
export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || (session.role !== 'SUPER_ADMIN' && session.role !== 'ADMIN' && session.role !== 'OWNER')) {
      return NextResponse.json({ error: 'Acesso restrito ao operador do SaaS' }, { status: 403 });
    }

    const [
      totalTenants,
      activeTenants,
      subscriptions,
      totalCustomers,
      totalAppointments,
      plans,
    ] = await Promise.all([
      prisma.barbershop.count(),
      prisma.barbershop.count({ where: { isActive: true } }),
      prisma.subscription.findMany({ include: { plan: true } }),
      prisma.customer.count({ where: { deletedAt: null } }),
      prisma.appointment.count(),
      prisma.plan.findMany(),
    ]);

    const activeSubs = subscriptions.filter((s) => s.status === 'ACTIVE');
    const trialSubs = subscriptions.filter((s) => s.status === 'TRIALING');
    const cancelledSubs = subscriptions.filter((s) => s.status === 'CANCELLED');

    // Calculate MRR
    const mrr = activeSubs.reduce((acc, s) => acc + (s.plan?.price || 0), 0);
    const arr = mrr * 12;

    const churnRate =
      subscriptions.length > 0
        ? Math.round((cancelledSubs.length / subscriptions.length) * 100)
        : 0;

    return NextResponse.json({
      metrics: {
        totalTenants,
        activeTenants,
        activeSubscribers: activeSubs.length,
        trialingTenants: trialSubs.length,
        cancelledTenants: cancelledSubs.length,
        mrr,
        arr,
        churnRate,
        totalCustomers,
        totalAppointments,
      },
      plans,
    });
  } catch (error: any) {
    console.error('Admin metrics error:', error);
    return NextResponse.json({ error: 'Erro ao carregar métricas do SaaS' }, { status: 500 });
  }
}
