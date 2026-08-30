import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatBrazilDate } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

// GET /api/financial-management/reports
export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session || !session.barbershopId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const reportType = searchParams.get('type') || 'cash_flow';
    const format = searchParams.get('format') || 'json';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    const now = new Date();
    const startDate = startDateParam
      ? new Date(`${startDateParam}T00:00:00-03:00`)
      : new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    const endDate = endDateParam
      ? new Date(`${endDateParam}T23:59:59.999-03:00`)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const barbershopId = session.barbershopId;

    // Fetch all transactions in range
    const transactions = await prisma.financialTransaction.findMany({
      where: {
        barbershopId,
        OR: [
          { paidDate: { gte: startDate, lte: endDate } },
          { dueDate: { gte: startDate, lte: endDate } },
        ],
      },
      include: {
        category: true,
        account: true,
        supplier: true,
        customer: true,
      },
      orderBy: [{ paidDate: 'asc' }, { dueDate: 'asc' }],
    });

    let reportData: any = null;
    let csvRows: string[] = [];

    // 1. Relatório: Despesas por Categoria
    if (reportType === 'expenses_by_category') {
      const catMap = new Map<string, { name: string; color: string; count: number; total: number }>();
      for (const t of transactions) {
        if (t.type !== 'EXPENSE' || t.status === 'CANCELADO' || t.status === 'ESTORNADO') continue;
        const cName = t.category?.name || 'Sem Categoria';
        const color = t.category?.color || '#71717a';
        const existing = catMap.get(cName) || { name: cName, color, count: 0, total: 0 };
        existing.count += 1;
        existing.total += t.amount;
        catMap.set(cName, existing);
      }
      reportData = Array.from(catMap.values()).sort((a, b) => b.total - a.total);

      if (format === 'csv') {
        csvRows.push('Categoria,Quantidade,Total (R$)');
        reportData.forEach((r: any) => {
          csvRows.push(`"${r.name}",${r.count},${r.total.toFixed(2)}`);
        });
      }
    }

    // 2. Relatório: Receitas por Categoria
    else if (reportType === 'incomes_by_category') {
      const catMap = new Map<string, { name: string; color: string; count: number; total: number }>();
      for (const t of transactions) {
        if (t.type !== 'INCOME' || t.status === 'CANCELADO' || t.status === 'ESTORNADO') continue;
        const cName = t.category?.name || 'Serviços';
        const color = t.category?.color || '#10b981';
        const existing = catMap.get(cName) || { name: cName, color, count: 0, total: 0 };
        existing.count += 1;
        existing.total += t.amount;
        catMap.set(cName, existing);
      }
      reportData = Array.from(catMap.values()).sort((a, b) => b.total - a.total);

      if (format === 'csv') {
        csvRows.push('Categoria,Quantidade,Total (R$)');
        reportData.forEach((r: any) => {
          csvRows.push(`"${r.name}",${r.count},${r.total.toFixed(2)}`);
        });
      }
    }

    // 3. Relatório: Contas a Pagar / Pagas
    else if (reportType === 'payables') {
      reportData = transactions
        .filter((t) => t.type === 'EXPENSE')
        .map((t) => ({
          id: t.id,
          description: t.description,
          supplier: t.supplier?.name || '-',
          category: t.category?.name || 'Despesa',
          amount: t.amount,
          dueDate: t.dueDate ? formatBrazilDate(t.dueDate) : '-',
          paidDate: t.paidDate ? formatBrazilDate(t.paidDate) : '-',
          status: t.status,
          paymentMethod: t.paymentMethod || '-',
        }));

      if (format === 'csv') {
        csvRows.push('Descricao,Fornecedor,Categoria,Valor (R$),Vencimento,Pagamento,Status,Metodo');
        reportData.forEach((r: any) => {
          csvRows.push(`"${r.description}","${r.supplier}","${r.category}",${r.amount.toFixed(2)},"${r.dueDate}","${r.paidDate}","${r.status}","${r.paymentMethod}"`);
        });
      }
    }

    // 4. Relatório: Contas a Receber / Recebidas
    else if (reportType === 'receivables') {
      reportData = transactions
        .filter((t) => t.type === 'INCOME')
        .map((t) => ({
          id: t.id,
          description: t.description,
          customer: t.customer?.name || '-',
          category: t.category?.name || 'Receita',
          amount: t.amount,
          dueDate: t.dueDate ? formatBrazilDate(t.dueDate) : '-',
          paidDate: t.paidDate ? formatBrazilDate(t.paidDate) : '-',
          status: t.status,
          paymentMethod: t.paymentMethod || '-',
        }));

      if (format === 'csv') {
        csvRows.push('Descricao,Cliente,Categoria,Valor (R$),Vencimento,Recebimento,Status,Metodo');
        reportData.forEach((r: any) => {
          csvRows.push(`"${r.description}","${r.customer}","${r.category}",${r.amount.toFixed(2)},"${r.dueDate}","${r.paidDate}","${r.status}","${r.paymentMethod}"`);
        });
      }
    }

    // 5. Relatório: Contas Vencidas
    else if (reportType === 'overdue') {
      const today = new Date();
      reportData = transactions
        .filter(
          (t) =>
            (t.status === 'PENDENTE' || t.status === 'ATRASADO') &&
            t.dueDate &&
            t.dueDate < today
        )
        .map((t) => ({
          id: t.id,
          description: t.description,
          type: t.type === 'EXPENSE' ? 'A Pagar' : 'A Receber',
          contact: t.supplier?.name || t.customer?.name || '-',
          amount: t.amount,
          dueDate: t.dueDate ? formatBrazilDate(t.dueDate) : '-',
          status: 'ATRASADO',
        }));

      if (format === 'csv') {
        csvRows.push('Descricao,Tipo,Contato,Valor (R$),Vencimento,Status');
        reportData.forEach((r: any) => {
          csvRows.push(`"${r.description}","${r.type}","${r.contact}",${r.amount.toFixed(2)},"${r.dueDate}","${r.status}"`);
        });
      }
    }

    // 6. Relatório Padrão: Fluxo de Caixa / Movimentações Gerais
    else {
      reportData = transactions
        .filter((t) => t.status !== 'CANCELADO')
        .map((t) => ({
          id: t.id,
          date: t.paidDate ? formatBrazilDate(t.paidDate) : t.dueDate ? formatBrazilDate(t.dueDate) : '-',
          description: t.description,
          type: t.type,
          category: t.category?.name || '-',
          account: t.account?.name || '-',
          amount: t.amount,
          feeAmount: t.feeAmount,
          netAmount: t.netAmount,
          status: t.status,
          method: t.paymentMethod || '-',
        }));

      if (format === 'csv') {
        csvRows.push('Data,Descricao,Tipo,Categoria,Conta,Valor Bruto (R$),Taxa (R$),Valor Liquido (R$),Status,Metodo');
        reportData.forEach((r: any) => {
          csvRows.push(`"${r.date}","${r.description}","${r.type}","${r.category}","${r.account}",${r.amount.toFixed(2)},${r.feeAmount.toFixed(2)},${r.netAmount.toFixed(2)},"${r.status}","${r.method}"`);
        });
      }
    }

    if (format === 'csv') {
      const csvContent = csvRows.join('\n');
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="relatorio_${reportType}_${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({
      reportType,
      startDate,
      endDate,
      data: reportData,
    });
  } catch (error: any) {
    console.error('Reports API Error:', error);
    return NextResponse.json({ error: 'Erro ao gerar relatório' }, { status: 500 });
  }
}
