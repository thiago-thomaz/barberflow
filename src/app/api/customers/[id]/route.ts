import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/tenant';

// GET /api/customers/[id] - Get customer profile with complete visit history
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id: params.id,
        barbershopId: session.barbershopId,
        deletedAt: null,
      },
      include: {
        stats: true,
        appointments: {
          include: {
            barber: { select: { id: true, name: true } },
            service: { select: { id: true, name: true, price: true } },
          },
          orderBy: { scheduledAt: 'desc' },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ customer });
  } catch (error: any) {
    console.error('Error fetching customer details:', error);
    return NextResponse.json({ error: 'Erro ao buscar dados do cliente' }, { status: 500 });
  }
}

// PATCH /api/customers/[id] - Update customer
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, email, birthDate, notes } = body;

    const existing = await prisma.customer.findFirst({
      where: { id: params.id, barbershopId: session.barbershopId, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    const updated = await prisma.customer.update({
      where: { id: params.id },
      data: {
        ...(name ? { name: name.trim() } : {}),
        ...(phone ? { phone: phone.trim() } : {}),
        ...(email !== undefined ? { email: email ? email.trim() : null } : {}),
        ...(birthDate !== undefined ? { birthDate: birthDate ? new Date(birthDate) : null } : {}),
        ...(notes !== undefined ? { notes: notes ? notes.trim() : null } : {}),
      },
    });

    await logAuditEvent({
      tenantId: session.barbershopId,
      userId: session.userId,
      action: 'UPDATE',
      entity: 'Customer',
      entityId: params.id,
      metadata: { changes: body },
    });

    return NextResponse.json({ success: true, customer: updated });
  } catch (error: any) {
    console.error('Error updating customer:', error);
    return NextResponse.json({ error: 'Erro ao atualizar cliente' }, { status: 500 });
  }
}

// DELETE /api/customers/[id] - Soft delete customer
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const existing = await prisma.customer.findFirst({
      where: { id: params.id, barbershopId: session.barbershopId, deletedAt: null },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    await prisma.customer.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    });

    await logAuditEvent({
      tenantId: session.barbershopId,
      userId: session.userId,
      action: 'DELETE',
      entity: 'Customer',
      entityId: params.id,
    });

    return NextResponse.json({ success: true, message: 'Cliente removido com sucesso' });
  } catch (error: any) {
    console.error('Error deleting customer:', error);
    return NextResponse.json({ error: 'Erro ao remover cliente' }, { status: 500 });
  }
}
