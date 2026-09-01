import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin, logAdminAuditEvent } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin(req);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const method = searchParams.get('method');
    const search = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '50')));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (method && method !== 'ALL') {
      where.method = method;
    }

    if (search) {
      where.OR = [
        { reference: { contains: search } },
        { notes: { contains: search } },
        { barbershop: { name: { contains: search } } },
        { barbershop: { slug: { contains: search } } },
      ];
    }

    const [total, payments, stats] = await Promise.all([
      prisma.saaSPayment.count({ where }),
      prisma.saaSPayment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          barbershop: {
            select: {
              id: true,
              name: true,
              slug: true,
              phone: true,
            },
          },
          subscription: {
            include: { plan: true },
          },
        },
      }),
      prisma.saaSPayment.findMany({
        where: { status: 'PAID' },
        select: { amount: true },
      }),
    ]);

    const totalPaidRevenue = stats.reduce((acc, p) => acc + p.amount, 0);

    return NextResponse.json({
      success: true,
      data: payments,
      summary: {
        totalPaidRevenue,
        totalTransactions: total,
      },
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
    console.error('[AdminPayments GET API Error]:', error);
    return NextResponse.json({ error: 'Erro ao listar pagamentos do SaaS' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user: adminUser } = await requireSuperAdmin(req);
    const body = await req.json();

    const {
      barbershopId,
      amount,
      method = 'PIX',
      status = 'PAID',
      paidAt,
      dueDate,
      reference,
      notes,
    } = body;

    if (!barbershopId || amount === undefined) {
      return NextResponse.json(
        { error: 'Barbearia (barbershopId) e valor (amount) são obrigatórios' },
        { status: 400 }
      );
    }

    const barbershop = await prisma.barbershop.findUnique({
      where: { id: barbershopId },
      include: { subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    if (!barbershop) {
      return NextResponse.json({ error: 'Barbearia não encontrada' }, { status: 404 });
    }

    const activeSub = barbershop.subscriptions[0] || null;

    const payment = await prisma.saaSPayment.create({
      data: {
        barbershopId,
        subscriptionId: activeSub ? activeSub.id : null,
        amount: parseFloat(amount),
        method,
        status,
        paidAt: paidAt ? new Date(paidAt) : (status === 'PAID' ? new Date() : null),
        dueDate: dueDate ? new Date(dueDate) : null,
        reference: reference || null,
        notes: notes || null,
      },
      include: {
        barbershop: true,
      },
    });

    // If paid and subscription was past due, automatically reactivate subscription
    if (status === 'PAID' && activeSub && activeSub.status === 'PAST_DUE') {
      await prisma.subscription.update({
        where: { id: activeSub.id },
        data: { status: 'ACTIVE' },
      });
    }

    await logAdminAuditEvent({
      adminUserId: adminUser.id,
      action: 'RECORD_PAYMENT',
      entity: 'SaaSPayment',
      entityId: payment.id,
      tenantId: barbershopId,
      metadata: {
        amount: payment.amount,
        status: payment.status,
        method: payment.method,
        reference: payment.reference,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: 'Pagamento registrado com sucesso no ledger do SaaS',
      data: payment,
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Acesso restrito ao Super Admin' }, { status: 403 });
    }
    console.error('[AdminPayments POST API Error]:', error);
    return NextResponse.json({ error: 'Erro ao registrar pagamento' }, { status: 500 });
  }
}
