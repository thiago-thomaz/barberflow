import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

// GET /api/business-hours - Get business hours configuration for tenant
export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const hours = await prisma.businessHours.findMany({
      where: { barbershopId: session.barbershopId },
      orderBy: { dayOfWeek: 'asc' },
    });

    return NextResponse.json({ hours });
  } catch (error: any) {
    console.error('Error fetching business hours:', error);
    return NextResponse.json({ error: 'Erro ao buscar horários de funcionamento' }, { status: 500 });
  }
}

// PUT /api/business-hours - Update business hours
export async function PUT(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { hours } = body; // Array of { dayOfWeek, openTime, closeTime, isOpen }

    if (!Array.isArray(hours)) {
      return NextResponse.json({ error: 'Formato de horários inválido' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      for (const h of hours) {
        await tx.businessHours.upsert({
          where: {
            barbershopId_dayOfWeek: {
              barbershopId: session.barbershopId!,
              dayOfWeek: Number(h.dayOfWeek),
            },
          },
          update: {
            openTime: h.openTime,
            closeTime: h.closeTime,
            isOpen: Boolean(h.isOpen),
          },
          create: {
            barbershopId: session.barbershopId!,
            dayOfWeek: Number(h.dayOfWeek),
            openTime: h.openTime,
            closeTime: h.closeTime,
            isOpen: Boolean(h.isOpen),
          },
        });
      }
    });

    await logAuditEvent({
      tenantId: session.barbershopId,
      userId: session.userId,
      action: 'UPDATE',
      entity: 'BusinessHours',
      metadata: { hoursCount: hours.length },
    });

    const updatedHours = await prisma.businessHours.findMany({
      where: { barbershopId: session.barbershopId },
      orderBy: { dayOfWeek: 'asc' },
    });

    return NextResponse.json({ success: true, hours: updatedHours });
  } catch (error: any) {
    console.error('Error updating business hours:', error);
    return NextResponse.json({ error: 'Erro ao atualizar horários' }, { status: 500 });
  }
}
