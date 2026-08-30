import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateGoogleCalendarUrl } from '@/lib/calendar';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params.token;
  if (!token) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  const appointment = await prisma.appointment.findUnique({
    where: { publicToken: token },
    include: { barbershop: true, barber: true, service: true },
  });

  if (!appointment) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  const gcalUrl = generateGoogleCalendarUrl({
    id: appointment.id,
    publicToken: appointment.publicToken,
    scheduledAt: appointment.scheduledAt,
    endAt: appointment.endAt,
    price: appointment.price,
    serviceName: appointment.service?.name || appointment.serviceNameSnapshot || 'Serviço',
    barberName: appointment.barber?.name || 'Barbeiro',
    shopName: appointment.barbershop.name,
    shopAddress: appointment.barbershop.address,
    shopCity: appointment.barbershop.city,
    publicUrl: `https://barber.projetosunion.cloud/agendamento/${appointment.publicToken}`,
  });

  return NextResponse.redirect(gcalUrl);
}
