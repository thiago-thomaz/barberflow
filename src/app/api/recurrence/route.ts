import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getRecurrenceDashboardMetrics, recalculateAllShopRecurrence } from '@/lib/recurrence';

export const dynamic = 'force-dynamic';

// GET /api/recurrence - Overall recurrence metrics & "Dinheiro Deixado na Mesa"
export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const metrics = await getRecurrenceDashboardMetrics(session.barbershopId);

    return NextResponse.json({ metrics });
  } catch (error: any) {
    console.error('Error getting recurrence metrics:', error);
    return NextResponse.json({ error: 'Erro ao calcular métricas de recorrência' }, { status: 500 });
  }
}
