import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/tenant';

// PATCH /api/services/[id] - Update service details or toggle active status
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const service = await prisma.service.findFirst({
      where: { id: params.id, barbershopId: session.barbershopId, deletedAt: null },
    });

    if (!service) {
      return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const { name, description, durationMin, price, isActive } = body;

    const dataToUpdate: any = {};
    if (name !== undefined) dataToUpdate.name = name.trim();
    if (description !== undefined) dataToUpdate.description = description ? description.trim() : null;
    if (durationMin !== undefined) {
      const dur = parseInt(durationMin, 10);
      if (isNaN(dur) || dur <= 0) {
        return NextResponse.json({ error: 'Duração deve ser maior que zero' }, { status: 400 });
      }
      dataToUpdate.durationMin = dur;
    }
    if (price !== undefined) {
      const pr = parseFloat(price);
      if (isNaN(pr) || pr < 0) {
        return NextResponse.json({ error: 'Preço deve ser maior ou igual a zero' }, { status: 400 });
      }
      dataToUpdate.price = pr;
    }
    if (isActive !== undefined) dataToUpdate.isActive = Boolean(isActive);

    const updated = await prisma.service.update({
      where: { id: params.id },
      data: dataToUpdate,
    });

    await logAuditEvent({
      tenantId: session.barbershopId,
      userId: session.userId,
      action: 'UPDATE',
      entity: 'Service',
      entityId: params.id,
      metadata: { changes: body },
    });

    return NextResponse.json({ success: true, service: updated });
  } catch (error: any) {
    console.error('Error updating service:', error);
    return NextResponse.json({ error: 'Erro ao atualizar serviço' }, { status: 500 });
  }
}

// DELETE /api/services/[id] - Soft delete service
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const service = await prisma.service.findFirst({
      where: { id: params.id, barbershopId: session.barbershopId, deletedAt: null },
    });

    if (!service) {
      return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 });
    }

    await prisma.service.update({
      where: { id: params.id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await logAuditEvent({
      tenantId: session.barbershopId,
      userId: session.userId,
      action: 'DELETE',
      entity: 'Service',
      entityId: params.id,
    });

    return NextResponse.json({ success: true, message: 'Serviço desativado com sucesso' });
  } catch (error: any) {
    console.error('Error deleting service:', error);
    return NextResponse.json({ error: 'Erro ao desativar serviço' }, { status: 500 });
  }
}
