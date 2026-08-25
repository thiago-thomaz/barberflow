import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/recurrence/at-risk - List customers at risk of churn with individual recovery value
export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const customers = await prisma.customer.findMany({
      where: {
        barbershopId: session.barbershopId,
        status: 'EM_RISCO',
        deletedAt: null,
      },
      include: {
        stats: true,
      },
      orderBy: {
        stats: {
          daysSinceLastVisit: 'desc',
        },
      },
    });

    const formatted = customers.map((c) => {
      const stats = c.stats;
      const cycle = stats?.medianDaysBetween || stats?.avgDaysBetweenVisits || 30;
      const daysSince = stats?.daysSinceLastVisit || 0;
      const daysOverdue = Math.max(0, daysSince - cycle);
      const avgTicket = stats?.avgTicket || 45;
      const cleanPhone = c.phone.replace(/\D/g, '');

      const firstName = c.name.split(' ')[0];
      const message = `Fala, ${firstName}! Tudo bem? Sentimos sua falta aqui na barbearia. Já faz ${daysSince} dias do seu último corte. Que tal reservar um horário essa semana para renovar o visual?`;
      const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        status: c.status,
        lastVisitDate: stats?.lastVisitDate,
        totalVisits: stats?.totalVisits || 0,
        cycleDays: cycle,
        daysSinceLastVisit: daysSince,
        daysOverdue,
        avgTicket,
        potentialRevenue: avgTicket,
        whatsappUrl,
        suggestedMessage: message,
      };
    });

    const totalOpportunity = formatted.reduce((acc, c) => acc + c.potentialRevenue, 0);

    return NextResponse.json({
      customers: formatted,
      totalOpportunity,
      count: formatted.length,
    });
  } catch (error: any) {
    console.error('Error fetching at-risk customers:', error);
    return NextResponse.json({ error: 'Erro ao buscar clientes em risco' }, { status: 500 });
  }
}
