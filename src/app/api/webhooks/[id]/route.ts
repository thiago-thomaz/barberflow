import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// PATCH /api/webhooks/[id] - Update webhook
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const existing = await prisma.webhook.findFirst({
      where: { id: params.id, barbershopId: session.barbershopId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Webhook não encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const { url, secret, events, isActive } = body;

    const dataToUpdate: any = {};
    if (url) dataToUpdate.url = url.trim();
    if (secret) dataToUpdate.secret = secret.trim();
    if (events) dataToUpdate.events = Array.isArray(events) ? JSON.stringify(events) : events;
    if (isActive !== undefined) dataToUpdate.isActive = Boolean(isActive);

    const updated = await prisma.webhook.update({
      where: { id: params.id },
      data: dataToUpdate,
    });

    return NextResponse.json({ success: true, webhook: updated });
  } catch (error: any) {
    console.error('Error updating webhook:', error);
    return NextResponse.json({ error: 'Erro ao atualizar webhook' }, { status: 500 });
  }
}

// DELETE /api/webhooks/[id] - Delete webhook
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const existing = await prisma.webhook.findFirst({
      where: { id: params.id, barbershopId: session.barbershopId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Webhook não encontrado' }, { status: 404 });
    }

    await prisma.webhook.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true, message: 'Webhook removido com sucesso' });
  } catch (error: any) {
    console.error('Error deleting webhook:', error);
    return NextResponse.json({ error: 'Erro ao excluir webhook' }, { status: 500 });
  }
}
