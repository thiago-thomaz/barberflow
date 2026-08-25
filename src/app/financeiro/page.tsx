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

  const summary = data?.summary;
  const topServices = data?.topServices || [];
  const barberRevenues = data?.barberRevenues || [];
  const paymentMethods = data?.paymentMethods || [];
  const recentPayments = data?.recentPayments || [];

  return (
    <AppShell
      title="Gestão Financeira"
      subtitle="Controle de receitas, ticket médio, comissões por barbeiro e métodos de pagamento"
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Faturamento Hoje"
            value={formatCurrency(summary?.revenueToday || 0)}
            subtitle="Receita realizada hoje"
            icon={DollarSign}
            highlight="emerald"
          />
          <StatCard
            title="Faturamento da Semana"
            value={formatCurrency(summary?.revenueWeek || 0)}
            subtitle="Acumulado semanal"
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
            title="Ticket Médio"
            value={formatCurrency(summary?.avgTicket || 0)}
            subtitle={`${summary?.totalTransactions || 0} atendimentos pagos`}
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
                {recentPayments.map((p: any) => (
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
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] font-medium text-zinc-300 border border-zinc-700">
                        {p.method}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                      {formatCurrency(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
