import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getMoneyOnTheTableFullMetrics } from '@/lib/recurrence';

export const dynamic = 'force-dynamic';

// GET /api/recurrence/recovery - Detailed Money on the Table intelligence & recovery metrics
export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const metrics = await getMoneyOnTheTableFullMetrics(session.barbershopId);

    return NextResponse.json({ metrics });
  } catch (error: any) {
    console.error('Recurrence Recovery API Error:', error);
    return NextResponse.json({ error: 'Erro ao carregar inteligência de receita' }, { status: 500 });
  }
}
