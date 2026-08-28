import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTodayDateStringSP } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

// GET /api/public/whatsapp/availability - Availability for n8n or conversational bot
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug') || 'barbearia-imperial';
    const dateStr = searchParams.get('date') || getTodayDateStringSP();
    const serviceId = searchParams.get('serviceId');
    const barberId = searchParams.get('barberId');

    const shop = await prisma.barbershop.findUnique({
      where: { slug },
      include: {
        services: { where: { isActive: true, deletedAt: null } },
        barbers: { where: { isActive: true, deletedAt: null } },
      },
    });

    if (!shop) {
      return NextResponse.json({ error: 'Barbearia não encontrada' }, { status: 404 });
    }

    const [year, month, day] = dateStr.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);
    const dayOfWeek = targetDate.getDay();

    const businessHours = await prisma.businessHours.findUnique({
      where: { barbershopId_dayOfWeek: { barbershopId: shop.id, dayOfWeek } },
    });

    if (!businessHours || !businessHours.isOpen) {
      return NextResponse.json({
        available: false,
        message: 'Barbearia fechada nesta data',
        slots: [],
      });
    }

    let serviceDuration = 30;
    if (serviceId) {
      const s = shop.services.find((svc) => svc.id === serviceId);
      if (s) serviceDuration = s.durationMin;
    }

    const [openH, openM] = businessHours.openTime.split(':').map(Number);
    const [closeH, closeM] = businessHours.closeTime.split(':').map(Number);

    const startOfDay = new Date(`${dateStr}T00:00:00-03:00`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999-03:00`);

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        barbershopId: shop.id,
        status: { notIn: ['CANCELADO', 'NO_SHOW'] },
        scheduledAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    const now = new Date();
    const availableSlots: string[] = [];

    let currentMin = openH * 60 + openM;
    const closeMin = closeH * 60 + closeM;

    while (currentMin + serviceDuration <= closeMin) {
      const h = Math.floor(currentMin / 60);
      const m = currentMin % 60;
      const slotTime = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const slotStart = new Date(`${dateStr}T${slotTime}:00-03:00`);
      const slotEnd = new Date(slotStart.getTime() + serviceDuration * 60 * 1000);

      if (slotStart > now) {
        let hasBarber = false;
        if (barberId && barberId !== 'ANY') {
          const conflict = existingAppointments.some(
            (a) => a.barberId === barberId && a.scheduledAt < slotEnd && a.endAt > slotStart
          );
          if (!conflict) hasBarber = true;
        } else {
          for (const b of shop.barbers) {
            const conflict = existingAppointments.some(
              (a) => a.barberId === b.id && a.scheduledAt < slotEnd && a.endAt > slotStart
            );
            if (!conflict) {
              hasBarber = true;
              break;
            }
          }
        }

        if (hasBarber) availableSlots.push(slotTime);
      }

      currentMin += 30;
    }

    return NextResponse.json({
      barbershop: { id: shop.id, name: shop.name, slug: shop.slug },
      date: dateStr,
      availableSlots,
      totalAvailable: availableSlots.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao consultar disponibilidade' }, { status: 500 });
  }
}
