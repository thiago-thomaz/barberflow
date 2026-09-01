import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin(req);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status'); // 'ACTIVE', 'INACTIVE', 'TRIAL', 'PAST_DUE'
    const planTier = searchParams.get('plan');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '50')));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { slug: { contains: search } },
        { phone: { contains: search } },
        { city: { contains: search } },
      ];
    }

    if (status === 'ACTIVE') {
      where.isActive = true;
    } else if (status === 'INACTIVE') {
      where.isActive = false;
    }

    const [total, barbershops] = await Promise.all([
      prisma.barbershop.count({ where }),
      prisma.barbershop.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          users: {
            where: { role: 'OWNER' },
            select: { id: true, name: true, email: true, role: true },
            take: 1,
          },
          subscriptions: {
            include: { plan: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: {
            select: {
              barbers: true,
              services: true,
              customers: true,
              appointments: true,
              users: true,
            },
          },
        },
      }),
    ]);

    const formatted = barbershops.map((b) => {
      const owner = b.users[0] || null;
      const sub = b.subscriptions[0] || null;

      return {
        id: b.id,
        name: b.name,
        slug: b.slug,
        phone: b.phone || '—',
        city: b.city ? `${b.city}/${b.state || ''}` : '—',
        isActive: b.isActive,
        createdAt: b.createdAt,
        owner: owner ? { name: owner.name, email: owner.email } : null,
        subscription: sub
          ? {
              status: sub.status,
              planName: sub.plan.name,
              planTier: sub.plan.tier,
              price: sub.plan.price,
              currentPeriodEnd: sub.currentPeriodEnd,
              trialEndsAt: sub.trialEndsAt,
            }
          : null,
        counts: b._count,
        whatsappActive: b.whatsappActive,
      };
    });

    return NextResponse.json({
      success: true,
      data: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Acesso restrito ao Super Admin' }, { status: 403 });
    }
    console.error('[AdminBarbershops API Error]:', error);
    return NextResponse.json({ error: 'Erro ao listar barbearias' }, { status: 500 });
  }
}
