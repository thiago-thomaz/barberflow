import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createOrGetVisagismSession } from '@/lib/visagism/engine';

export const dynamic = 'force-dynamic';

// POST /api/visagismo/session - Cria ou recupera uma sessão de visagismo
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { barbershopId, slug, phone, customerId } = body;

    let targetShopId = barbershopId;

    if (!targetShopId && slug) {
      const shop = await prisma.barbershop.findUnique({
        where: { slug },
      });
      if (shop) targetShopId = shop.id;
    }

    if (!targetShopId) {
      const firstShop = await prisma.barbershop.findFirst({
        where: { isActive: true },
      });
      if (firstShop) targetShopId = firstShop.id;
    }

    if (!targetShopId) {
      return NextResponse.json(
        { error: 'Barbearia não encontrada' },
        { status: 404 }
      );
    }

    const session = await createOrGetVisagismSession({
      barbershopId: targetShopId,
      phone,
      customerId,
    });

    const host = req.headers.get('host') || 'barber.projetosunion.cloud';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const directUrl = `${protocol}://${host}/visagismo/session/${session.publicToken}`;

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        publicToken: session.publicToken,
        status: session.status,
        expiresAt: session.expiresAt,
        directUrl,
        barbershop: session.barbershop,
      },
    });
  } catch (error: any) {
    console.error('Error creating visagism session:', error);
    return NextResponse.json(
      { error: 'Erro ao criar sessão de visagismo', details: error.message },
      { status: 500 }
    );
  }
}
