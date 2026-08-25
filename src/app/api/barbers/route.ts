import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/tenant';

// GET /api/barbers - List barbers for current tenant
export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active') === 'true';

    const barbers = await prisma.barber.findMany({
      where: {
        barbershopId: session.barbershopId,
        deletedAt: null,
        ...(activeOnly ? { isActive: true } : {}),
      },
      include: {
        _count: {
          select: { appointments: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ barbers });
  } catch (error: any) {
    console.error('Error fetching barbers:', error);
    return NextResponse.json({ error: 'Erro ao buscar barbeiros' }, { status: 500 });
  }
}

// POST /api/barbers - Create new barber for current tenant
export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, specialty, commission, avatarUrl } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Nome do barbeiro é obrigatório' }, { status: 400 });
    }

    const barber = await prisma.barber.create({
      data: {
        barbershopId: session.barbershopId,
        name: name.trim(),
        phone: phone?.trim() || null,
        specialty: specialty?.trim() || 'Cortes e barba',
        commission: commission !== undefined ? parseFloat(commission) : 0,
        avatarUrl: avatarUrl?.trim() || null,
        isActive: true,
      },
    });

    await logAuditEvent({
      tenantId: session.barbershopId,
      userId: session.userId,
      action: 'CREATE',
      entity: 'Barber',
      entityId: barber.id,
      metadata: { name: barber.name },
    });

    return NextResponse.json({ success: true, barber }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating barber:', error);
    return NextResponse.json({ error: 'Erro ao cadastrar barbeiro' }, { status: 500 });
  }
}
