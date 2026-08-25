import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/tenant';

// GET /api/services - List services for current tenant
export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active') === 'true';

    const services = await prisma.service.findMany({
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
      orderBy: { price: 'asc' },
    });

    return NextResponse.json({ services });
  } catch (error: any) {
    console.error('Error fetching services:', error);
    return NextResponse.json({ error: 'Erro ao buscar serviços' }, { status: 500 });
  }
}

// POST /api/services - Create new service for current tenant
export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, durationMin, price } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'Nome do serviço é obrigatório' }, { status: 400 });
    }

    const parsedPrice = parseFloat(price);
    const parsedDuration = parseInt(durationMin, 10);

    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json({ error: 'Preço deve ser maior ou igual a zero' }, { status: 400 });
    }

    if (isNaN(parsedDuration) || parsedDuration <= 0) {
      return NextResponse.json({ error: 'Duração deve ser maior que zero minutos' }, { status: 400 });
    }

    const service = await prisma.service.create({
      data: {
        barbershopId: session.barbershopId,
        name: name.trim(),
        description: description?.trim() || null,
        durationMin: parsedDuration,
        price: parsedPrice,
        isActive: true,
      },
    });

    await logAuditEvent({
      tenantId: session.barbershopId,
      userId: session.userId,
      action: 'CREATE',
      entity: 'Service',
      entityId: service.id,
      metadata: { name: service.name, price: service.price, duration: service.durationMin },
    });

    return NextResponse.json({ success: true, service }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating service:', error);
    return NextResponse.json({ error: 'Erro ao cadastrar serviço' }, { status: 500 });
  }
}
