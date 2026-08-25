import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/tenant';

// Normalize phone to numbers only or clean format
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

// GET /api/customers - List and search customers for tenant
export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const whereClause: any = {
      barbershopId: session.barbershopId,
      deletedAt: null,
    };

    if (query) {
      const cleanDigits = normalizePhone(query);
      whereClause.OR = [
        { name: { contains: query } },
        { phone: { contains: query } },
        ...(cleanDigits ? [{ phone: { contains: cleanDigits } }] : []),
      ];
    }

    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    const [total, customers] = await Promise.all([
      prisma.customer.count({ where: whereClause }),
      prisma.customer.findMany({
        where: whereClause,
        include: {
          stats: true,
          _count: {
            select: { appointments: true },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      customers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Erro ao buscar clientes' }, { status: 500 });
  }
}

// POST /api/customers - Create new customer for tenant
export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, email, birthDate, notes } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: 'Nome e telefone são obrigatórios' }, { status: 400 });
    }

    const cleanPhone = normalizePhone(phone);
    if (cleanPhone.length < 8) {
      return NextResponse.json({ error: 'Telefone inválido' }, { status: 400 });
    }

    // Check duplicate phone in the same tenant
    const existing = await prisma.customer.findFirst({
      where: {
        barbershopId: session.barbershopId,
        phone: { contains: cleanPhone.slice(-8) }, // Matches by core numbers
        deletedAt: null,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Já existe um cliente cadastrado com este telefone', existingCustomer: existing },
        { status: 409 }
      );
    }

    const customer = await prisma.$transaction(async (tx) => {
      const newCust = await tx.customer.create({
        data: {
          barbershopId: session.barbershopId!,
          name: name.trim(),
          phone: phone.trim(),
          email: email?.trim() || null,
          birthDate: birthDate ? new Date(birthDate) : null,
          notes: notes?.trim() || null,
          status: 'NOVO',
        },
      });

      // Initialize visit stats
      await tx.customerVisitStats.create({
        data: {
          customerId: newCust.id,
          totalVisits: 0,
          totalSpent: 0,
          avgTicket: 0,
          avgDaysBetweenVisits: 30,
          medianDaysBetween: 30,
        },
      });

      return newCust;
    });

    await logAuditEvent({
      tenantId: session.barbershopId,
      userId: session.userId,
      action: 'CREATE',
      entity: 'Customer',
      entityId: customer.id,
      metadata: { name: customer.name, phone: customer.phone },
    });

    return NextResponse.json({ success: true, customer }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating customer:', error);
    return NextResponse.json({ error: 'Erro interno ao cadastrar cliente' }, { status: 500 });
  }
}
