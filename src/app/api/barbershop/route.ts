import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/barbershop - Get current tenant profile
export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const shop = await prisma.barbershop.findUnique({
      where: { id: session.barbershopId },
    });

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
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, address, city, state } = body;

    const dataToUpdate: any = {};
    if (name) dataToUpdate.name = name.trim();
    if (phone !== undefined) dataToUpdate.phone = phone.trim();
    if (address !== undefined) dataToUpdate.address = address.trim();
    if (city !== undefined) dataToUpdate.city = city.trim();
    if (state !== undefined) dataToUpdate.state = state.trim();

    const updated = await prisma.barbershop.update({
      where: { id: session.barbershopId },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, shop: updated });
  } catch (error: any) {
    console.error('Error updating barbershop profile:', error);
    return NextResponse.json({ error: 'Erro ao atualizar dados da barbearia' }, { status: 500 });
  }
}
