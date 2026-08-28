import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateICSContent } from '@/lib/calendar';

export const dynamic = 'force-dynamic';

// GET /api/calendar/appointment/[token].ics - Universal iCalendar download
export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const rawToken = params.token || '';
    // Strip optional .ics extension if passed in token
    const token = rawToken.replace(/\.ics$/i, '');

    const appointment = await prisma.appointment.findUnique({
      where: { publicToken: token },
      include: {
        barbershop: true,
        barber: true,
        service: true,
        customer: true,
      },
    });

    if (!appointment) {
      return new NextResponse('Agendamento não encontrado', { status: 404 });
    }

    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const host = req.headers.get('host') || 'barber.projetosunion.cloud';
    const publicUrl = `${protocol}://${host}/agendamento/${appointment.publicToken}`;

    const icsString = generateICSContent({
      id: appointment.id,
      publicToken: appointment.publicToken,
      scheduledAt: appointment.scheduledAt,
      endAt: appointment.endAt,
      price: appointment.price,
      serviceName: appointment.service?.name || appointment.serviceNameSnapshot || 'Corte',
      barberName: appointment.barber?.name || 'Profissional',
      shopName: appointment.barbershop.name,
      shopPhone: appointment.barbershop.phone,
      shopAddress: appointment.barbershop.address,
      shopCity: appointment.barbershop.city,
      publicUrl,
    });

    const filename = `agendamento-${appointment.publicToken.slice(0, 8)}.ics`;

    return new NextResponse(icsString, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('Error generating .ics calendar:', error);
    return new NextResponse('Erro ao gerar calendário', { status: 500 });
  }
}
