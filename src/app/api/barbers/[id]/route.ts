import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/tenant';

// PATCH /api/barbers/[id] - Update barber details or toggle active status
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const barber = await prisma.barber.findFirst({
      where: { id: params.id, barbershopId: session.barbershopId, deletedAt: null },
    });

    if (!barber) {
      return NextResponse.json({ error: 'Barbeiro não encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const { name, phone, specialty, commission, avatarUrl, isActive } = body;

    const updated = await prisma.barber.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(phone !== undefined ? { phone: phone?.trim() || null } : {}),
        ...(specialty !== undefined ? { specialty: specialty?.trim() || null } : {}),
        ...(commission !== undefined ? { commission: parseFloat(commission) } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl?.trim() || null } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      },
    });

    await logAuditEvent({
      tenantId: session.barbershopId,
      userId: session.userId,
      action: 'UPDATE',
      entity: 'Barber',
      entityId: params.id,
      metadata: { changes: body },
    });

    return NextResponse.json({ success: true, barber: updated });
  } catch (error: any) {
    console.error('Error updating barber:', error);
    return NextResponse.json({ error: 'Erro ao atualizar barbeiro' }, { status: 500 });
  }
}

// DELETE /api/barbers/[id] - Soft delete barber
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const barber = await prisma.barber.findFirst({
      where: { id: params.id, barbershopId: session.barbershopId, deletedAt: null },
    });

    if (!barber) {
      return NextResponse.json({ error: 'Barbeiro não encontrado' }, { status: 404 });
    }

    await prisma.barber.update({
      where: { id: params.id },
      data: { deletedAt: new Date(), isActive: false },
    });

    await logAuditEvent({
      tenantId: session.barbershopId,
      userId: session.userId,
      action: 'DELETE',
      entity: 'Barber',
      entityId: params.id,
    });

    return NextResponse.json({ success: true, message: 'Barbeiro desativado com sucesso' });
  } catch (error: any) {
    console.error('Error deleting barber:', error);
    return NextResponse.json({ error: 'Erro ao desativar barbeiro' }, { status: 500 });
  }
}
