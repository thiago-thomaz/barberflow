import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/public/[slug]/available-slots?date=YYYY-MM-DD&serviceId=XYZ&barberId=ABC
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date');
    const serviceId = searchParams.get('serviceId');
    const barberId = searchParams.get('barberId'); // Optional

    if (!dateStr || !serviceId) {
      return NextResponse.json(
        { error: 'Data e ID do serviço são obrigatórios' },
        { status: 400 }
      );
    }

    const shop = await prisma.barbershop.findUnique({
      where: { slug: params.slug },
      include: {
        services: { where: { id: serviceId, isActive: true, deletedAt: null } },
        barbers: { where: { isActive: true, deletedAt: null } },
      },
    });

    if (!shop || shop.services.length === 0) {
      return NextResponse.json({ error: 'Serviço ou barbearia não encontrado' }, { status: 404 });
    }

    const service = shop.services[0];
    const duration = service.durationMin || 30;

    const targetDate = new Date(`${dateStr}T00:00:00`);
    const dayOfWeek = targetDate.getDay();

    const businessHours = await prisma.businessHours.findUnique({
      where: {
        barbershopId_dayOfWeek: {
          barbershopId: shop.id,
          dayOfWeek,
        },
      },
    });

    if (!businessHours || !businessHours.isOpen) {
      return NextResponse.json({
        available: false,
        message: 'Barbearia fechada neste dia',
        slots: [],
      });
    }

    const [openH, openM] = businessHours.openTime.split(':').map(Number);
    const [closeH, closeM] = businessHours.closeTime.split(':').map(Number);

    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    // Fetch existing appointments on that day
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        barbershopId: shop.id,
        status: { notIn: ['CANCELADO', 'NO_SHOW'] },
        scheduledAt: { gte: startOfDay, lte: endOfDay },
        ...(barberId && barberId !== 'ANY' ? { barberId } : {}),
      },
    });

    // Generate slots every 30 minutes
    const possibleSlots: string[] = [];
    for (let m = openMinutes; m + duration <= closeMinutes; m += 30) {
      const slotH = Math.floor(m / 60);
      const slotMin = m % 60;
      possibleSlots.push(
        `${String(slotH).padStart(2, '0')}:${String(slotMin).padStart(2, '0')}`
      );
    }

    const candidateBarbers =
      barberId && barberId !== 'ANY'
        ? shop.barbers.filter((b) => b.id === barberId)
        : shop.barbers;

    if (candidateBarbers.length === 0) {
      return NextResponse.json({ available: false, slots: [] });
    }

    // Filter available slots where at least 1 candidate barber is free
    const freeSlots: Array<{ time: string; availableBarberIds: string[] }> = [];

    for (const slot of possibleSlots) {
      const [sh, sm] = slot.split(':').map(Number);
      const slotStart = new Date(`${dateStr}T${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00`);
      const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);

      const availableBarberIds = candidateBarbers
        .filter((b) => {
          const hasConflict = existingAppointments.some(
            (app) =>
              app.barberId === b.id &&
              app.scheduledAt < slotEnd &&
              app.endAt > slotStart
          );
          return !hasConflict;
        })
        .map((b) => b.id);

      if (availableBarberIds.length > 0) {
        freeSlots.push({ time: slot, availableBarberIds });
      }
    }

    return NextResponse.json({
      available: true,
      serviceName: service.name,
      duration,
      slots: freeSlots,
    });
  } catch (error: any) {
    console.error('Error fetching available slots:', error);
    return NextResponse.json({ error: 'Erro ao calcular horários livres' }, { status: 500 });
  }
}
