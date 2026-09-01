import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, logAdminAuditEvent } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin(req);

    const barbershop = await prisma.barbershop.findUnique({
      where: { id: params.id },
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true, createdAt: true },
        },
        barbers: {
          select: { id: true, name: true, phone: true, commission: true, isActive: true },
        },
        services: {
          select: { id: true, name: true, price: true, durationMin: true, isActive: true },
        },
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
        },
        saasPayments: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            customers: true,
            appointments: true,
            whatsappMessages: true,
            auditLogs: true,
          },
        },
      },
    });

    if (!barbershop) {
      return NextResponse.json({ error: 'Barbearia não encontrada' }, { status: 404 });
    }

    // Aggregations on actual customer & appointment data
    const [recentAppointments, auditHistory] = await Promise.all([
      prisma.appointment.findMany({
        where: { barbershopId: params.id },
        take: 10,
        orderBy: { scheduledAt: 'desc' },
        include: {
          customer: { select: { name: true, phone: true } },
          barber: { select: { name: true } },
          service: { select: { name: true } },
        },
      }),
      prisma.adminAuditLog.findMany({
        where: { tenantId: params.id },
        take: 15,
        orderBy: { createdAt: 'desc' },
        include: { adminUser: { select: { name: true, email: true } } },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        ...barbershop,
        recentAppointments,
        auditHistory,
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Acesso restrito ao Super Admin' }, { status: 403 });
    }
    console.error('[AdminBarbershop360 API Error]:', error);
    return NextResponse.json({ error: 'Erro ao carregar detalhes 360 da barbearia' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user: adminUser } = await requireSuperAdmin(req);
    const body = await req.json();

    const { isActive, name, phone, address, city, state, reason, planId, subscriptionStatus } = body;

    const currentShop = await prisma.barbershop.findUnique({
      where: { id: params.id },
      include: { subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    if (!currentShop) {
      return NextResponse.json({ error: 'Barbearia não encontrada' }, { status: 404 });
    }

    const updateData: any = {};
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;

    const updatedShop = await prisma.barbershop.update({
      where: { id: params.id },
      data: updateData,
    });

    // Update subscription or plan if requested
    if (planId || subscriptionStatus) {
      const activeSub = currentShop.subscriptions[0];
      if (activeSub) {
        const subUpdate: any = {};
        if (planId) subUpdate.planId = planId;
        if (subscriptionStatus) subUpdate.status = subscriptionStatus;

        await prisma.subscription.update({
          where: { id: activeSub.id },
          data: subUpdate,
        });
      }
    }

    // Determine audit action
    let action = 'UPDATE_TENANT';
    if (typeof isActive === 'boolean') {
      action = isActive ? 'REACTIVATE_TENANT' : 'SUSPEND_TENANT';
    } else if (planId || subscriptionStatus) {
      action = 'CHANGE_PLAN';
    }

    await logAdminAuditEvent({
      adminUserId: adminUser.id,
      action,
      entity: 'Barbershop',
      entityId: params.id,
      tenantId: params.id,
      metadata: {
        changes: updateData,
        planChange: planId || subscriptionStatus ? { planId, subscriptionStatus } : null,
        reason: reason || 'Alteração administrativa',
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: 'Barbearia atualizada com sucesso',
      data: updatedShop,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Acesso restrito ao Super Admin' }, { status: 403 });
    }
    console.error('[AdminBarbershopUpdate API Error]:', error);
    return NextResponse.json({ error: 'Erro ao atualizar barbearia' }, { status: 500 });
  }
}
