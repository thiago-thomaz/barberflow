import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { recalculateAllShopRecurrence } from '@/lib/recurrence';

export const dynamic = 'force-dynamic';

// POST /api/recurrence/recalculate - Force recalculation of recurrence for all shop customers
export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const results = await recalculateAllShopRecurrence(session.barbershopId);

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error: any) {
    console.error('Error recalculating shop recurrence:', error);
    return NextResponse.json({ error: 'Erro ao recalcular recorrência' }, { status: 500 });
  }
}
