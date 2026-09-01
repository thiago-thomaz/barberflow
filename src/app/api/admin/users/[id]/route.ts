import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, logAdminAuditEvent } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user: currentAdmin } = await requireSuperAdmin(req);
    const body = await req.json();
    const { role, name, reason } = body;

    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
      include: { barbershop: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Protection: do not allow admin to demote themselves to prevent locking out
    if (params.id === currentAdmin.id && role && role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Não é permitido remover seu próprio privilégio de SUPER_ADMIN' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (role) {
      const allowedRoles = ['SUPER_ADMIN', 'OWNER', 'BARBER', 'RECEPTIONIST'];
      if (!allowedRoles.includes(role)) {
        return NextResponse.json({ error: 'Função de usuário inválida' }, { status: 400 });
      }
      updateData.role = role;
    }
    if (name) updateData.name = name;

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, barbershopId: true },
    });

    await logAdminAuditEvent({
      adminUserId: currentAdmin.id,
      action: 'UPDATE_USER',
      entity: 'User',
      entityId: params.id,
      tenantId: targetUser.barbershopId,
      metadata: {
        previousRole: targetUser.role,
        newRole: role || targetUser.role,
        reason: reason || 'Alteração administrativa de perfil',
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: 'Usuário atualizado com sucesso',
      data: updatedUser,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Acesso restrito ao Super Admin' }, { status: 403 });
    }
    console.error('[AdminUserUpdate API Error]:', error);
    return NextResponse.json({ error: 'Erro ao atualizar usuário' }, { status: 500 });
  }
}
