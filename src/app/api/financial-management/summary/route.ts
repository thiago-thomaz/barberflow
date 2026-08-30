import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { getFinancialManagementSummary } from '@/lib/financial';

export const dynamic = 'force-dynamic';

// GET /api/financial-management/summary
export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const startDate = startDateParam ? new Date(`${startDateParam}T00:00:00-03:00`) : undefined;
    const endDate = endDateParam ? new Date(`${endDateParam}T23:59:59.999-03:00`) : undefined;

    const summary = await getFinancialManagementSummary(session.barbershopId, startDate, endDate);

    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error('Financial Summary API Error:', error);
    return NextResponse.json({ error: 'Erro ao carregar resumo financeiro' }, { status: 500 });
  }
}
