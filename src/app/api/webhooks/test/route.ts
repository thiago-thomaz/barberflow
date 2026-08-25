import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { signWebhookPayload } from '@/lib/events';

export const dynamic = 'force-dynamic';

// POST /api/webhooks/test - Test webhook connection with real HTTP ping & HMAC signature
export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { url, secret } = body;

    if (!url || !url.startsWith('http')) {
      return NextResponse.json({ error: 'URL do Webhook inválida' }, { status: 400 });
    }

    const testPayload = {
      event: 'TEST_PING',
      timestamp: new Date().toISOString(),
      tenant_id: session.barbershopId,
      data: {
        message: 'Teste de conexão do BarberFlow com n8n realizado com sucesso!',
        source: 'BarberFlow SaaS Automation Engine',
      },
    };

    const payloadString = JSON.stringify(testPayload);
    const signature = signWebhookPayload(payloadString, secret || 'default_secret');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const startTime = Date.now();
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BarberFlow-Event': 'TEST_PING',
          'X-BarberFlow-Signature': signature,
          'X-BarberFlow-Timestamp': testPayload.timestamp,
        },
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;

      return NextResponse.json({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        latencyMs,
        message: response.ok
          ? `Conexão estabelecida com sucesso! (HTTP ${response.status} em ${latencyMs}ms)`
          : `O servidor de destino respondeu com HTTP ${response.status} (${response.statusText})`,
      });
    } catch (err: any) {
      clearTimeout(timeout);
      return NextResponse.json({
        success: false,
        status: 0,
        message: `Falha ao alcançar webhook: ${err.message || 'Timeout de conexão'}`,
      });
    }
  } catch (error: any) {
    console.error('Webhook Test Error:', error);
    return NextResponse.json({ error: 'Erro ao testar webhook' }, { status: 500 });
  }
}
