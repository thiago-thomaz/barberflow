import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/recurrence/due-for-return - Customers who typically return soon
export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const customers = await prisma.customer.findMany({
      where: {
        barbershopId: session.barbershopId,
        status: { in: ['ATIVO', 'VIP'] },
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

    const dueList = [];
    for (const c of customers) {
      const stats = c.stats;
      if (!stats || stats.totalVisits < 1) continue;

      const cycle = stats.medianDaysBetween || stats.avgDaysBetweenVisits || 30;
      const daysSince = stats.daysSinceLastVisit || 0;

      // Window: between cycle - 4 days and cycle + 3 days
      if (daysSince >= cycle - 4 && daysSince <= cycle + 3) {
        const daysRemaining = Math.max(0, cycle - daysSince);
        const cleanPhone = c.phone.replace(/\D/g, '');
        const firstName = c.name.split(' ')[0];
        const message = `Olá, ${firstName}! Notamos que seu ciclo habitual de corte está completando. Quer garantir o seu horário para os próximos dias?`;
        const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;

        dueList.push({
          id: c.id,
          name: c.name,
          phone: c.phone,
          status: c.status,
          lastVisitDate: stats.lastVisitDate,
          cycleDays: cycle,
          daysSinceLastVisit: daysSince,
          daysRemaining,
          estimatedNextVisit: stats.estimatedNextVisit,
          avgTicket: stats.avgTicket || 45,
          whatsappUrl,
          suggestedMessage: message,
        });
      }
    }

    return NextResponse.json({
      customers: dueList,
      count: dueList.length,
    });
  } catch (error: any) {
    console.error('Error fetching due-for-return customers:', error);
    return NextResponse.json({ error: 'Erro ao buscar clientes próximos de retornar' }, { status: 500 });
  }
}
