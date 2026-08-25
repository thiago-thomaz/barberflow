import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/recurrence/inactive - List inactive customers with days away
export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const customers = await prisma.customer.findMany({
      where: {
        barbershopId: session.barbershopId,
        status: 'INATIVO',
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
      const daysSince = stats?.daysSinceLastVisit || 0;
      const avgTicket = stats?.avgTicket || 45;
      const cleanPhone = c.phone.replace(/\D/g, '');
      const firstName = c.name.split(' ')[0];
      const message = `Olá, ${firstName}! Faz um tempinho que você não passa aqui na barbearia. Preparamos uma condição especial para seu retorno. Que tal agendar seu horário?`;
      const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        status: c.status,
        lastVisitDate: stats?.lastVisitDate,
        totalVisits: stats?.totalVisits || 0,
        daysSinceLastVisit: daysSince,
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
    console.error('Error fetching inactive customers:', error);
    return NextResponse.json({ error: 'Erro ao buscar clientes inativos' }, { status: 500 });
  }
}
