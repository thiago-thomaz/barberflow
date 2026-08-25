import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

// GET /api/webhooks - List active webhooks for tenant
export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const webhooks = await prisma.webhook.findMany({
      where: { barbershopId: session.barbershopId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ webhooks });
  } catch (error: any) {
    console.error('Error listing webhooks:', error);
    return NextResponse.json({ error: 'Erro ao listar webhooks' }, { status: 500 });
  }
}

// POST /api/webhooks - Register new webhook (e.g. n8n webhook URL)
export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { url, secret, events, isActive } = body;

    if (!url || !url.startsWith('http')) {
      return NextResponse.json({ error: 'URL do Webhook inválida' }, { status: 400 });
    }

    const generatedSecret =
      secret && secret.trim().length > 0
        ? secret.trim()
        : `whsec_${crypto.randomBytes(16).toString('hex')}`;

    const eventsJson = Array.isArray(events) ? JSON.stringify(events) : JSON.stringify(['*']);

    const webhook = await prisma.webhook.create({
      data: {
        barbershopId: session.barbershopId,
        url: url.trim(),
        secret: generatedSecret,
        events: eventsJson,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    return NextResponse.json({ success: true, webhook }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating webhook:', error);
    return NextResponse.json({ error: 'Erro ao registrar webhook' }, { status: 500 });
  }
}
