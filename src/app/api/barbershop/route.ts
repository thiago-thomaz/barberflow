import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/barbershop - Get current tenant profile
export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    let shop = null;
    if (session.barbershopId) {
      shop = await prisma.barbershop.findUnique({
        where: { id: session.barbershopId },
      });
    }

    if (!shop) {
      shop = await prisma.barbershop.findFirst();
    }

    if (!shop) {
      return NextResponse.json({ error: 'Barbearia não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ shop });
  } catch (error: any) {
    console.error('Error fetching barbershop profile:', error);
    return NextResponse.json({ error: 'Erro ao carregar dados da barbearia' }, { status: 500 });
  }
}

// PATCH /api/barbershop - Update current tenant profile
export async function PATCH(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, address, city, state } = body;

    let shop = null;
    if (session.barbershopId) {
      shop = await prisma.barbershop.findUnique({
        where: { id: session.barbershopId },
      });
    }

    if (!shop) {
      shop = await prisma.barbershop.findFirst();
    }

    if (!shop) {
      return NextResponse.json({ error: 'Barbearia não encontrada no sistema' }, { status: 404 });
    }

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = String(name).trim();
    if (phone !== undefined) dataToUpdate.phone = String(phone).trim();
    if (address !== undefined) dataToUpdate.address = String(address).trim();
    if (city !== undefined) dataToUpdate.city = String(city).trim();
    if (state !== undefined) dataToUpdate.state = String(state).trim();

    const updated = await prisma.barbershop.update({
      where: { id: shop.id },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, shop: updated });
  } catch (error: any) {
    console.error('Error updating barbershop profile:', error);
    return NextResponse.json({ error: error.message || 'Erro ao atualizar dados da barbearia' }, { status: 500 });
  }
}
