import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/health - Lightweight health probe for Docker, Coolify and uptime monitors
export async function GET() {
  const startTime = Date.now();
  let dbStatus = 'ok';

  try {
    // Quick ping query
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    dbStatus = 'unreachable';
  }

  const latencyMs = Date.now() - startTime;
  const isHealthy = dbStatus === 'ok';

  return NextResponse.json(
    {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      database: dbStatus,
      latencyMs,
    },
    { status: isHealthy ? 200 : 503 }
  );
}
