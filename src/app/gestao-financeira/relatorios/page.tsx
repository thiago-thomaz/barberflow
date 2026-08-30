'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { StatCard } from '@/components/UI/StatCard';
import { formatCurrency } from '@/lib/utils';
import {
  FileText,
  Download,
  Filter,
  Calendar,
  DollarSign,
  PieChart,
  BarChart2,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from 'lucide-react';

export default function RelatoriosFinanceirosPage() {
  const [reportType, setReportType] = useState('cash_flow');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const reportsList = [
    { id: 'cash_flow', label: '1. Fluxo de Caixa Realizado vs Previsto', icon: TrendingUp },
    { id: 'payables', label: '2. Contas a Pagar (Por Vencimento/Status)', icon: TrendingDown },
    { id: 'receivables', label: '3. Contas a Receber (Por Vencimento/Status)', icon: TrendingUp },
    { id: 'expenses_by_category', label: '4. Despesas por Categoria', icon: PieChart },
    { id: 'incomes_by_category', label: '5. Receitas por Categoria', icon: BarChart2 },
    { id: 'overdue', label: '6. Contas Vencidas / Inadimplência', icon: AlertCircle },
  ];

  const fetchReport = async () => {
    try {
      setLoading(true);
      const url = new URL('/api/financial-management/reports', window.location.origin);
      url.searchParams.set('type', reportType);
      if (startDate) url.searchParams.set('startDate', startDate);
      if (endDate) url.searchParams.set('endDate', endDate);

      const res = await fetch(url.toString());
      const json = await res.json();
      if (res.ok) {
        setReportData(json.data || []);
      }
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType]);

  const handleDownloadCsv = () => {
    const url = new URL('/api/financial-management/reports', window.location.origin);
    url.searchParams.set('type', reportType);
    url.searchParams.set('format', 'csv');
    if (startDate) url.searchParams.set('startDate', startDate);
    if (endDate) url.searchParams.set('endDate', endDate);

    window.open(url.toString(), '_blank');
  };

  return (
    <AppShell
      title="Relatórios Financeiros"
      subtitle="Relatórios consolidados, DRE simplificado, centros de custo e exportação em CSV"
      actions={
        <button
          onClick={handleDownloadCsv}
          className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black px-3.5 py-2 text-xs font-bold transition-all shadow-md shadow-amber-500/20"
        >
          <Download className="h-4 w-4" />
          <span>Exportar Planilha (CSV)</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* SUBNAV / NAVIGATION TABS */}
        <div className="flex items-center gap-2 bg-[#14171C] p-2 rounded-xl border border-[#22262E] overflow-x-auto">
          {[
            { href: '/gestao-financeira', label: 'Visão Geral', active: false },
            { href: '/gestao-financeira/receber', label: 'Contas a Receber', active: false },
            { href: '/gestao-financeira/pagar', label: 'Contas a Pagar', active: false },
            { href: '/gestao-financeira/fluxo-caixa', label: 'Fluxo de Caixa', active: false },
            { href: '/gestao-financeira/caixa', label: 'Caixa Diário', active: false },
            { href: '/gestao-financeira/relatorios', label: 'Relatórios & CSV', active: true },
          ].map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                tab.active
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* CONTROLS BAR: SELECT REPORT + DATE FILTER */}
        <div className="p-4 rounded-xl bg-[#14171C] border border-[#22262E] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-zinc-400">Tipo de Relatório:</span>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="rounded-lg bg-[#0D0F12] border border-[#22262E] px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
            >
              {reportsList.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-400">Período:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg bg-[#0D0F12] border border-[#22262E] px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
            />
            <span className="text-xs text-zinc-500">até</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg bg-[#0D0F12] border border-[#22262E] px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={fetchReport}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white border border-zinc-700"
            >
              Filtrar
            </button>
          </div>
        </div>

        {/* REPORT CONTENT VIEWER */}
        <div className="rounded-xl border border-[#22262E] bg-[#14171C] overflow-hidden shadow-xl">
          <div className="p-4 border-b border-[#22262E] flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">Resultado do Relatório</h3>
            <span className="text-xs text-zinc-500">{reportData.length} registros encontrados</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-500">Processando relatório...</div>
          ) : reportData.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500">
              Nenhum dado encontrado para o filtro e tipo de relatório selecionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              {reportType === 'expenses_by_category' || reportType === 'incomes_by_category' ? (
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="border-b border-[#22262E] text-[11px] font-semibold uppercase tracking-wider text-zinc-500 bg-[#0D0F12]">
                    <tr>
                      <th className="py-3 px-4">Categoria</th>
                      <th className="py-3 px-4">Lançamentos</th>
                      <th className="py-3 px-4 text-right">Total (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#22262E]/60">
                    {reportData.map((cat, idx) => (
                      <tr key={idx} className="hover:bg-[#1A1D23]/50 transition-colors">
                        <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: cat.color || '#f59e0b' }}
                          />
                          <span>{cat.name}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-zinc-400">{cat.count}</td>
                        <td className="py-3 px-4 font-mono font-bold text-white text-right">
                          {formatCurrency(cat.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="border-b border-[#22262E] text-[11px] font-semibold uppercase tracking-wider text-zinc-500 bg-[#0D0F12]">
                    <tr>
                      <th className="py-3 px-4">Data / Vencimento</th>
                      <th className="py-3 px-4">Descrição</th>
                      <th className="py-3 px-4">Tipo / Categoria</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#22262E]/60">
                    {reportData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#1A1D23]/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-zinc-400">
                          {item.date || item.dueDate || '-'}
                        </td>
                        <td className="py-3 px-4 font-medium text-white">{item.description}</td>
                        <td className="py-3 px-4 text-zinc-400">
                          {item.category || item.type || '-'}
                        </td>
                        <td className="py-3 px-4 font-semibold text-zinc-300">
                          {item.status || '-'}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-right text-white">
                          {formatCurrency(item.amount || item.netAmount || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
