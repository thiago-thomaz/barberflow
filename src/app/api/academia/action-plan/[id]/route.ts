import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = params;
    const barbershopId = session.barbershopId;
    const body = await req.json().catch(() => ({}));
    const { status } = body;

    if (!status || !['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Status inválido. Use PENDENTE, EM_ANDAMENTO ou CONCLUIDO' },
        { status: 400 }
      );
    }

    // Busca garantindo isolamento de tenant
    const existing = await prisma.academyActionPlan.findFirst({
      where: { id, barbershopId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Item do plano de ação não encontrado ou não pertence a esta barbearia' },
        { status: 404 }
      );
    }

    const updated = await prisma.academyActionPlan.update({
      where: { id },
      data: {
        status,
        completedAt: status === 'CONCLUIDO' ? new Date() : null,
      },
    });

    return NextResponse.json({
      success: true,
      actionPlan: updated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao atualizar item do plano de ação' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const { id } = params;
    const barbershopId = session.barbershopId;

    const existing = await prisma.academyActionPlan.findFirst({
      where: { id, barbershopId },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Item não encontrado ou acesso negado' },
        { status: 404 }
      );
    }

    await prisma.academyActionPlan.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Item excluído com sucesso',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Erro ao excluir item' },
      { status: 500 }
    );
  }
}
