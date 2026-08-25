import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/financial - Financial metrics and analytics
export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const barbershopId = session.barbershopId;
    const now = new Date();

    // 1. Time Ranges
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // 2. Fetch Payments
    const payments = await prisma.payment.findMany({
      where: {
        barbershopId,
        status: 'PAGO',
      },
      include: {
        appointment: {
          include: {
            service: true,
          },
        },
        barber: true,
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Today revenue
    const revenueToday = payments
      .filter((p) => p.createdAt >= startOfToday && p.createdAt <= endOfToday)
      .reduce((acc, p) => acc + p.amount, 0);

    // Week revenue
    const revenueWeek = payments
      .filter((p) => p.createdAt >= startOfWeek)
      .reduce((acc, p) => acc + p.amount, 0);

    // Month revenue
    const revenueMonth = payments
      .filter((p) => p.createdAt >= startOfMonth && p.createdAt <= endOfMonth)
      .reduce((acc, p) => acc + p.amount, 0);

    // Total count & ticket médio
    const totalTransactions = payments.length;
    const totalRevenueAllTime = payments.reduce((acc, p) => acc + p.amount, 0);
    const avgTicket = totalTransactions > 0 ? totalRevenueAllTime / totalTransactions : 0;

    // 3. Top Services
    const serviceMap = new Map<string, { name: string; count: number; totalRevenue: number }>();
    for (const p of payments) {
      const srvName = p.appointment?.service?.name || 'Serviço';
      const existing = serviceMap.get(srvName) || { name: srvName, count: 0, totalRevenue: 0 };
      existing.count += 1;
      existing.totalRevenue += p.amount;
      serviceMap.set(srvName, existing);
    }
    const topServices = Array.from(serviceMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);

    // 4. Revenue by Barber
    const barberMap = new Map<string, { id: string; name: string; count: number; totalRevenue: number; commission: number }>();
    for (const p of payments) {
      if (!p.barber) continue;
      const bId = p.barber.id;
      const existing = barberMap.get(bId) || {
        id: bId,
        name: p.barber.name,
        count: 0,
        totalRevenue: 0,
        commission: p.barber.commission || 50,
      };
      existing.count += 1;
      existing.totalRevenue += p.amount;
      barberMap.set(bId, existing);
    }
    const barberRevenues = Array.from(barberMap.values()).map((b) => ({
      ...b,
      estimatedPayout: (b.totalRevenue * b.commission) / 100,
      shopNet: (b.totalRevenue * (100 - b.commission)) / 100,
    }));

    // 5. Payment Methods Distribution
    const methodsMap = new Map<string, { method: string; count: number; total: number }>();
    for (const p of payments) {
      const m = p.method || 'OUTRO';
      const existing = methodsMap.get(m) || { method: m, count: 0, total: 0 };
      existing.count += 1;
      existing.total += p.amount;
      methodsMap.set(m, existing);
    }
    const paymentMethods = Array.from(methodsMap.values());

    return NextResponse.json({
      summary: {
        revenueToday,
        revenueWeek,
        revenueMonth,
        avgTicket,
        totalTransactions,
        totalRevenueAllTime,
      },
      topServices,
      barberRevenues,
      paymentMethods,
      recentPayments: payments.slice(0, 15),
    });
  } catch (error: any) {
    console.error('Financial API Error:', error);
    return NextResponse.json({ error: 'Erro ao carregar dados financeiros' }, { status: 500 });
  }
}
