import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const barbershopId = session.barbershopId;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Read-only aggregated queries
    const [
      appointmentsMonth,
      barbersCount,
      customers,
      recentCompletedAppointments,
    ] = await Promise.all([
      prisma.appointment.count({
        where: {
          barbershopId,
          scheduledAt: { gte: thirtyDaysAgo },
          status: { in: ['CONCLUIDO', 'CONFIRMADO', 'AGENDADO'] },
        },
      }),
      prisma.barber.count({
        where: { barbershopId, isActive: true },
      }),
      prisma.customer.findMany({
        where: { barbershopId },
        select: {
          id: true,
          appointments: {
            take: 1,
            orderBy: { scheduledAt: 'desc' },
            select: { scheduledAt: true },
          },
        },
      }),
      prisma.appointment.findMany({
        where: {
          barbershopId,
          scheduledAt: { gte: thirtyDaysAgo },
          status: 'CONCLUIDO',
        },
        select: {
          price: true,
        },
      }),
    ]);

    // Calculate revenue and ticket
    const monthlyRevenue = recentCompletedAppointments.reduce((acc, app) => acc + (app.price || 0), 0);
    const avgTicket = recentCompletedAppointments.length > 0 ? monthlyRevenue / recentCompletedAppointments.length : 45;

    // Inactive clients (> 35 days without appointment)
    const thirtyFiveDaysAgo = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000);
    const inactiveCount = customers.filter((c) => {
      if (c.appointments.length === 0) return false;
      return new Date(c.appointments[0].scheduledAt) < thirtyFiveDaysAgo;
    }).length;

    // Estimated occupancy rate (assuming 10h/day * 25 days * active barbers)
    const effectiveBarbers = Math.max(1, barbersCount);
    const maxMonthlyCapacity = effectiveBarbers * 25 * 10 * 1.5; // ~1.5 cuts per hour per chair
    const occupancyRate = maxMonthlyCapacity > 0 ? Math.min(100, (appointmentsMonth / maxMonthlyCapacity) * 100) : 50;

    return NextResponse.json({
      success: true,
      metrics: {
        monthlyRevenue: monthlyRevenue || 0,
        monthlyAppointments: appointmentsMonth || 0,
        avgTicket: Number(avgTicket.toFixed(2)),
        barbersCount: effectiveBarbers,
        inactiveClientsCount: inactiveCount,
        occupancyRate: Number(occupancyRate.toFixed(1)),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao carregar métricas' },
      { status: 500 }
    );
  }
}
