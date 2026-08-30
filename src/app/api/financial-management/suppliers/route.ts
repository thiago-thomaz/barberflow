import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/financial-management/suppliers
export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const suppliers = await prisma.supplier.findMany({
      where: { barbershopId: session.barbershopId },
      include: {
        _count: {
          select: { transactions: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ suppliers });
  } catch (error: any) {
    console.error('Suppliers API Error:', error);
    return NextResponse.json({ error: 'Erro ao listar fornecedores' }, { status: 500 });
  }
}

// POST /api/financial-management/suppliers
export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { name, document, phone, email, notes } = body;

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: 'Nome do fornecedor é obrigatório.' }, { status: 400 });
    }

    const supplier = await prisma.supplier.create({
      data: {
        barbershopId: session.barbershopId,
        name: name.trim(),
        document: document || null,
        phone: phone || null,
        email: email || null,
        notes: notes || null,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, supplier });
  } catch (error: any) {
    console.error('Create Supplier API Error:', error);
    return NextResponse.json({ error: 'Erro ao criar fornecedor' }, { status: 500 });
  }
}
