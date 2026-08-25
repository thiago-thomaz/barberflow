import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getRecurrenceDashboardMetrics } from '@/lib/recurrence';

export const dynamic = 'force-dynamic';

// GET /api/dashboard - Consolidated Dashboard Metrics, Today KPIs, Alerts and Upcoming appointments
export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const barbershopId = session.barbershopId;
    const now = new Date();

    // Start and end of today
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    // 1. Fetch Today Appointments
    const todayAppointments = await prisma.appointment.findMany({
      where: {
        barbershopId,
        scheduledAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        barber: { select: { id: true, name: true } },
        service: { select: { id: true, name: true, price: true, durationMin: true } },
        payment: true,
      },
      orderBy: { scheduledAt: 'asc' },
    });

    const totalToday = todayAppointments.length;
    const completedToday = todayAppointments.filter((a) => a.status === 'CONCLUIDO');
    const cancelledToday = todayAppointments.filter((a) => a.status === 'CANCELADO');
    const noShowToday = todayAppointments.filter((a) => a.status === 'NO_SHOW');

    const revenueForecastToday = todayAppointments
      .filter((a) => a.status !== 'CANCELADO')
      .reduce((acc, a) => acc + (a.price || 0), 0);

    const revenueRealizedToday = completedToday.reduce((acc, a) => acc + (a.price || 0), 0);

    // 2. Recurrence & Customer Health Metrics
    const recurrenceMetrics = await getRecurrenceDashboardMetrics(barbershopId);

    // 3. Today Operating Capacity
    const dayOfWeek = now.getDay();
    const businessHours = await prisma.businessHours.findUnique({
      where: {
        barbershopId_dayOfWeek: {
          barbershopId,
          dayOfWeek,
        },
      },
    });

    let openSlotsCount = 0;
    if (businessHours && businessHours.isOpen) {
      const [openH] = businessHours.openTime.split(':').map(Number);
      const [closeH] = businessHours.closeTime.split(':').map(Number);
      const activeBarbers = await prisma.barber.count({ where: { barbershopId, isActive: true, deletedAt: null } });
      const totalPossibleSlots = (closeH - openH) * 2 * (activeBarbers || 1);
      openSlotsCount = Math.max(0, totalPossibleSlots - (totalToday - cancelledToday.length));
    }

    // 4. Smart Alerts
    const alerts: Array<{ type: 'warning' | 'info' | 'success'; message: string; actionUrl?: string }> = [];

    if (recurrenceMetrics.countAtRisk > 0) {
      alerts.push({
        type: 'warning',
        message: `${recurrenceMetrics.countAtRisk} cliente(s) estão em risco de sumir (passaram do intervalo normal).`,
        actionUrl: '/recorrencia',
      });
    }

    if (recurrenceMetrics.totalOpportunity > 0) {
      alerts.push({
        type: 'info',
        message: `Você tem aproximadamente R$ ${recurrenceMetrics.totalOpportunity.toFixed(2)} em oportunidades recuperáveis no "Dinheiro na Mesa".`,
        actionUrl: '/recorrencia',
      });
    }

    if (openSlotsCount > 0) {
      alerts.push({
        type: 'info',
        message: `Você possui horários vagos hoje na grade de atendimento.`,
        actionUrl: '/agenda',
      });
    }

    // 5. Next upcoming appointments today (not completed or cancelled)
    const upcomingToday = todayAppointments
      .filter((a) => a.status === 'AGENDADO' || a.status === 'CONFIRMADO' || a.status === 'EM_ATENDIMENTO')
      .slice(0, 8);

    return NextResponse.json({
      kpis: {
        todayTotal: totalToday,
        todayCompleted: completedToday.length,
        todayCancelled: cancelledToday.length,
        todayNoShow: noShowToday.length,
        revenueForecastToday,
        revenueRealizedToday,
        openSlotsCount,
      },
      recurrence: recurrenceMetrics,
      alerts,
      upcomingToday,
    });
  } catch (error: any) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json({ error: 'Erro ao carregar dados do dashboard' }, { status: 500 });
  }
}
