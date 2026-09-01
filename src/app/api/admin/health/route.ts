import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin(req);

    // 1. Check Database latency
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const dbLatencyMs = Date.now() - dbStart;

    // 2. Check WAHA WhatsApp Integration status
    const wahaUrl = process.env.WAHA_URL || 'https://evo.projetosunion.cloud';
    const wahaApiKey = process.env.WAHA_API_KEY || 'bf_waha_sec_9e06180371424a1b80c355fb5dc21182';
    const defaultSession = process.env.WAHA_DEFAULT_SESSION || 'default';

    let wahaStatus = 'UNKNOWN';
    let wahaLatencyMs = 0;
    try {
      const wStart = Date.now();
      const res = await fetch(`${wahaUrl}/api/sessions/${defaultSession}`, {
        headers: { 'X-Api-Key': wahaApiKey },
        signal: AbortSignal.timeout(3000),
      });
      wahaLatencyMs = Date.now() - wStart;
      if (res.ok) {
        const data = await res.json();
        wahaStatus = data.status || 'WORKING';
      } else {
        wahaStatus = `HTTP_${res.status}`;
      }
    } catch (wErr: any) {
      wahaStatus = 'DISCONNECTED';
    }

    // 3. Count total database records
    const [totalTenants, totalAppointments, totalAuditLogs, totalMessages] = await Promise.all([
      prisma.barbershop.count(),
      prisma.appointment.count(),
      prisma.adminAuditLog.count(),
      prisma.whatsappMessage.count(),
    ]);

    // 4. Memory & Uptime
    const memoryUsage = process.memoryUsage();
    const uptimeSec = process.uptime();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      status: dbLatencyMs < 200 && (wahaStatus === 'WORKING' || wahaStatus === 'STARTING') ? 'HEALTHY' : 'WARNING',
      services: {
        app: {
          status: 'ONLINE',
          version: '0.1.0',
          phase: 'Phase 20 (Admin Console)',
          nodeVersion: process.version,
          uptimeSeconds: Math.round(uptimeSec),
          memory: {
            heapUsedMB: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            rssMB: Math.round(memoryUsage.rss / 1024 / 1024),
          },
        },
        database: {
          engine: 'SQLite (Prisma ORM)',
          status: 'CONNECTED',
          latencyMs: dbLatencyMs,
          records: {
            tenants: totalTenants,
            appointments: totalAppointments,
            auditLogs: totalAuditLogs,
            whatsappMessages: totalMessages,
          },
        },
        whatsapp: {
          provider: process.env.WHATSAPP_PROVIDER || 'WAHA',
          url: wahaUrl,
          session: defaultSession,
          status: wahaStatus,
          latencyMs: wahaLatencyMs,
        },
        automations: {
          engine: 'n8n Webhook HMAC-SHA256 Bus',
          status: 'ACTIVE',
        },
      },
    });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    if (error.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Acesso restrito ao Super Admin' }, { status: 403 });
    }
    console.error('[AdminHealth API Error]:', error);
    return NextResponse.json({ error: 'Erro ao verificar saúde do sistema' }, { status: 500 });
  }
}
