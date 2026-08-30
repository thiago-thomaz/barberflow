'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/AppShell';
import { StatCard } from '@/components/UI/StatCard';
import { Badge } from '@/components/UI/Badge';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  CreditCard,
  Scissors,
  UserCheck,
  Percent,
  ArrowUpRight,
  Wallet,
} from 'lucide-react';

export default function FinanceiroPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom'>('this_month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const fetchFinancialData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/financial');
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const allPayments: any[] = data?.recentPayments || [];

  // Filter payments by selected period
  const filteredPayments = React.useMemo(() => {
    if (!allPayments.length) return [];
    const now = new Date();

    if (period === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return allPayments.filter((p) => {
        const d = new Date(p.createdAt);
        return d >= start && d <= end;
      });
    }

    if (period === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const start = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0);
      const end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
      return allPayments.filter((p) => {
        const d = new Date(p.createdAt);
        return d >= start && d <= end;
      });
    }

    if (period === 'this_week') {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      return allPayments.filter((p) => new Date(p.createdAt) >= monday);
    }

    if (period === 'last_week') {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1) - 7;
      const lastMonday = new Date(d.setDate(diff));
      lastMonday.setHours(0, 0, 0, 0);
      const lastSunday = new Date(lastMonday);
      lastSunday.setDate(lastSunday.getDate() + 6);
      lastSunday.setHours(23, 59, 59, 999);
      return allPayments.filter((p) => {
        const pDate = new Date(p.createdAt);
        return pDate >= lastMonday && pDate <= lastSunday;
      });
    }

    if (period === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return allPayments.filter((p) => new Date(p.createdAt) >= start);
    }

    if (period === 'last_month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return allPayments.filter((p) => {
        const pDate = new Date(p.createdAt);
        return pDate >= start && pDate <= end;
      });
    }

    if (period === 'custom') {
      return allPayments.filter((p) => {
        const pDate = new Date(p.createdAt);
        if (customStart && pDate < new Date(`${customStart}T00:00:00`)) return false;
        if (customEnd && pDate > new Date(`${customEnd}T23:59:59`)) return false;
        return true;
      });
    }

    return allPayments;
  }, [allPayments, period, customStart, customEnd]);

  // Derived filtered metrics
  const filteredRevenue = filteredPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
  const filteredCount = filteredPayments.length;
  const filteredAvgTicket = filteredCount > 0 ? filteredRevenue / filteredCount : 0;

  const summary = data?.summary;
  const topServices = data?.topServices || [];
  const barberRevenues = data?.barberRevenues || [];
  const paymentMethods = data?.paymentMethods || [];

  return (
    <AppShell
      title="Faturamento & Vendas"
      subtitle="Controle de faturamento, ticket médio, comissões por barbeiro e métodos de pagamento"
    >
      <div className="space-y-6">
        {/* Period Filter Bar */}
        <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between bg-[#14171C] p-4 rounded-xl border border-[#22262E]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-400">Filtrar Período:</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'today', label: 'Hoje' },
                { id: 'yesterday', label: 'Ontem' },
                { id: 'this_week', label: 'Esta Semana' },
                { id: 'last_week', label: 'Semana Passada' },
                { id: 'this_month', label: 'Este Mês' },
                { id: 'last_month', label: 'Mês Passado' },
                { id: 'custom', label: 'Personalizado' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setPeriod(item.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    period === item.id
                      ? 'bg-amber-500 text-black border-amber-500 shadow-md shadow-amber-500/20'
                      : 'bg-zinc-800/80 text-zinc-300 hover:text-white border-zinc-700/60 hover:bg-zinc-700'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Inputs if Custom selected */}
          {period === 'custom' && (
            <div className="flex items-center gap-2 bg-[#0D0F12] p-1.5 rounded-lg border border-[#22262E]">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-transparent text-xs text-amber-400 px-2 py-1 focus:outline-none cursor-pointer"
                placeholder="De"
              />
              <span className="text-xs text-zinc-600">até</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-transparent text-xs text-amber-400 px-2 py-1 focus:outline-none cursor-pointer"
                placeholder="Até"
              />
            </div>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Faturamento do Período"
            value={formatCurrency(filteredRevenue || 0)}
            subtitle={`${filteredCount} pagamento(s) no filtro`}
            icon={DollarSign}
            highlight="emerald"
          />
          <StatCard
            title="Faturamento Hoje"
            value={formatCurrency(summary?.revenueToday || 0)}
            subtitle="Receita realizada hoje"
            icon={TrendingUp}
            highlight="blue"
          />
          <StatCard
            title="Faturamento do Mês"
            value={formatCurrency(summary?.revenueMonth || 0)}
            subtitle="Acumulado mensal"
            icon={Calendar}
            highlight="gold"
          />
          <StatCard
            title="Ticket Médio (Período)"
            value={formatCurrency(filteredAvgTicket || 0)}
            subtitle={`Média por atendimento`}
            icon={Wallet}
            highlight="none"
          />
        </div>

        {/* SECTION 2: Top Services & Barber Earnings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Services */}
          <div className="rounded-xl border border-[#22262E] bg-[#14171C] p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#22262E] pb-3">
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Serviços Mais Vendidos</h3>
              </div>
              <span className="text-xs text-zinc-500">Por volume e receita</span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-zinc-500">Carregando serviços...</div>
            ) : topServices.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500">
                Nenhum pagamento registrado ainda.
              </div>
            ) : (
              <div className="space-y-2.5">
                {topServices.map((srv: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#0D0F12] border border-[#22262E]"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="h-6 w-6 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center text-xs font-bold font-mono">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-bold text-white text-xs block">{srv.name}</span>
                        <span className="text-[11px] text-zinc-400">
                          {srv.count} atendimentos realizados
                        </span>
                      </div>
                    </div>
                    <span className="font-extrabold text-emerald-400 text-xs">
                      {formatCurrency(srv.totalRevenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Barber Revenues & Commissions */}
          <div className="rounded-xl border border-[#22262E] bg-[#14171C] p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#22262E] pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Faturamento por Barbeiro</h3>
              </div>
              <span className="text-xs text-zinc-500">Comissões estimadas</span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-zinc-500">Carregando barbeiros...</div>
            ) : barberRevenues.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500">
                Nenhum faturamento por profissional registrado.
              </div>
            ) : (
              <div className="space-y-2.5">
                {barberRevenues.map((b: any) => (
                  <div
                    key={b.id}
                    className="p-3 rounded-lg bg-[#0D0F12] border border-[#22262E] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{b.name}</span>
                      <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {b.commission}% Comissão
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 border-t border-zinc-800/80">
                      <div>
                        <span className="text-zinc-500 block">Total Bruto</span>
                        <span className="font-semibold text-white">
                          {formatCurrency(b.totalRevenue)}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Comissão Barbeiro</span>
                        <span className="font-semibold text-amber-400">
                          {formatCurrency(b.estimatedPayout)}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Líquido Barbearia</span>
                        <span className="font-semibold text-emerald-400">
                          {formatCurrency(b.shopNet)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: Recent Transactions & Payment Methods */}
        <div className="rounded-xl border border-[#22262E] bg-[#14171C] p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#22262E] pb-3">
            <h3 className="font-bold text-white text-sm">Extrato de Pagamentos Recentes</h3>
            <div className="flex items-center gap-3 text-xs">
              {paymentMethods.map((m: any) => (
                <span key={m.method} className="text-zinc-400">
                  <strong className="text-white">{m.method}</strong>: {formatCurrency(m.total)}
                </span>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="border-b border-[#22262E] text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="pb-3 px-3">Data / Hora</th>
                  <th className="pb-3 px-3">Cliente</th>
                  <th className="pb-3 px-3">Barbeiro</th>
                  <th className="pb-3 px-3">Serviço</th>
                  <th className="pb-3 px-3">Forma</th>
                  <th className="pb-3 px-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#22262E]/60">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-zinc-500">
                      Nenhum pagamento encontrado para o período selecionado.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-[#1A1D23]/50 transition-colors">
                      <td className="py-2.5 px-3 text-zinc-400">
                        {formatDate(p.createdAt)} às {formatTime(p.createdAt)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-white">
                        {p.customer?.name || 'Cliente Balcão'}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-300">{p.barber?.name || '-'}</td>
                      <td className="py-2.5 px-3 text-zinc-300">
                        {p.appointment?.service?.name || 'Atendimento'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded text-[10px] border border-amber-500/20">
                          {p.method}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-400 font-mono">
                        {formatCurrency(p.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
