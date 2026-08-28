import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/automacoes/settings - Get barbershop WhatsApp & Reminder preferences
export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const shop = await prisma.barbershop.findUnique({
      where: { id: session.barbershopId },
      select: {
        id: true,
        name: true,
        slug: true,
        whatsappActive: true,
        reminder24h: true,
        reminder6h: true,
        reminder2h: true,
        reminder1h: true,
        whatsappApiKey: true,
        whatsappPhoneId: true,
      },
    });

    if (!shop) {
      return NextResponse.json({ error: 'Barbearia não encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      settings: {
        ...shop,
        // Mask secret API key
        whatsappApiKey: shop.whatsappApiKey ? '••••••••' + shop.whatsappApiKey.slice(-4) : '',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 });
  }
}

// PATCH /api/automacoes/settings - Update WhatsApp & Reminder preferences
export async function PATCH(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const {
      whatsappActive,
      reminder24h,
      reminder6h,
      reminder2h,
      reminder1h,
      whatsappApiKey,
      whatsappPhoneId,
    } = body;

    const dataToUpdate: any = {};
    if (typeof whatsappActive === 'boolean') dataToUpdate.whatsappActive = whatsappActive;
    if (typeof reminder24h === 'boolean') dataToUpdate.reminder24h = reminder24h;
    if (typeof reminder6h === 'boolean') dataToUpdate.reminder6h = reminder6h;
    if (typeof reminder2h === 'boolean') dataToUpdate.reminder2h = reminder2h;
    if (typeof reminder1h === 'boolean') dataToUpdate.reminder1h = reminder1h;
    if (whatsappPhoneId !== undefined) dataToUpdate.whatsappPhoneId = whatsappPhoneId;

    if (whatsappApiKey && !whatsappApiKey.startsWith('•••')) {
      dataToUpdate.whatsappApiKey = whatsappApiKey;
    }

    const updated = await prisma.barbershop.update({
      where: { id: session.barbershopId },
      data: dataToUpdate,
    });

    return NextResponse.json({
      success: true,
      settings: {
        whatsappActive: updated.whatsappActive,
        reminder24h: updated.reminder24h,
        reminder6h: updated.reminder6h,
        reminder2h: updated.reminder2h,
        reminder1h: updated.reminder1h,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro ao atualizar configurações' }, { status: 500 });
  }
}
