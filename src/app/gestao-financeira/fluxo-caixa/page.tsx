'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { StatCard } from '@/components/UI/StatCard';
import { Badge } from '@/components/UI/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  BarChart3,
} from 'lucide-react';

export default function FluxoCaixaPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<'current_month' | 'last_month' | 'last_30_days'>('current_month');

  const fetchFlowData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/financial-management/transactions?limit=200');
      const data = await res.json();
      if (res.ok) {
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error('Error fetching cash flow data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlowData();
  }, []);

  // Calculate Realized Incomes, Realized Expenses, Forecast Incomes, Forecast Expenses
  const realizedIncomes = transactions
    .filter((t) => t.type === 'INCOME' && (t.status === 'PAGO' || t.status === 'RECEBIDO' || t.status === 'CONFIRMADO'))
    .reduce((acc, t) => acc + t.amount, 0);

  const realizedExpenses = transactions
    .filter((t) => t.type === 'EXPENSE' && (t.status === 'PAGO' || t.status === 'CONFIRMADO'))
    .reduce((acc, t) => acc + t.amount, 0);

  const realizedNet = realizedIncomes - realizedExpenses;

  const pendingIncomes = transactions
    .filter((t) => t.type === 'INCOME' && t.status === 'PENDENTE')
    .reduce((acc, t) => acc + t.amount, 0);

  const pendingExpenses = transactions
    .filter((t) => t.type === 'EXPENSE' && t.status === 'PENDENTE')
    .reduce((acc, t) => acc + t.amount, 0);

  const projectedNet = (realizedIncomes + pendingIncomes) - (realizedExpenses + pendingExpenses);

  return (
    <AppShell
      title="Fluxo de Caixa"
      subtitle="Acompanhamento diário e projetado de entradas, saídas, saldo operacional e previsibilidade"
    >
      <div className="space-y-6">
        {/* SUBNAV / NAVIGATION TABS */}
        <div className="flex items-center gap-2 bg-[#14171C] p-2 rounded-xl border border-[#22262E] overflow-x-auto">
          {[
            { href: '/gestao-financeira', label: 'Visão Geral', active: false },
            { href: '/gestao-financeira/receber', label: 'Contas a Receber', active: false },
            { href: '/gestao-financeira/pagar', label: 'Contas a Pagar', active: false },
            { href: '/gestao-financeira/fluxo-caixa', label: 'Fluxo de Caixa', active: true },
            { href: '/gestao-financeira/caixa', label: 'Caixa Diário', active: false },
            { href: '/gestao-financeira/relatorios', label: 'Relatórios & CSV', active: false },
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

        {/* COMPARISON METRICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Realizado: Entradas"
            value={formatCurrency(realizedIncomes)}
            subtitle="Receitas já efetivadas"
            icon={TrendingUp}
            highlight="emerald"
          />
          <StatCard
            title="Realizado: Saídas"
            value={formatCurrency(realizedExpenses)}
            subtitle="Despesas já pagas"
            icon={TrendingDown}
            highlight="rose"
          />
          <StatCard
            title="Saldo Realizado"
            value={formatCurrency(realizedNet)}
            subtitle="Resultado líquido efetivado"
            icon={DollarSign}
            highlight={realizedNet >= 0 ? 'emerald' : 'rose'}
          />
          <StatCard
            title="Previsão Projetada"
            value={formatCurrency(projectedNet)}
            subtitle={`Realizado + Pendentes`}
            icon={BarChart3}
            highlight={projectedNet >= 0 ? 'gold' : 'rose'}
          />
        </div>

        {/* PROJECTION DETAIL BANNER */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-[#14171C] to-[#1A1D24] border border-[#22262E] grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
              <ArrowDownLeft className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-400">A Entrar nos Próximos Dias:</div>
              <div className="text-base font-bold text-emerald-400 font-mono">
                +{formatCurrency(pendingIncomes)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
              <ArrowUpRight className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-400">A Pagar nos Próximos Dias:</div>
              <div className="text-base font-bold text-rose-400 font-mono">
                -{formatCurrency(pendingExpenses)}
              </div>
            </div>
          </div>
        </div>

        {/* FLOW LOG TABLE */}
        <div className="rounded-xl border border-[#22262E] bg-[#14171C] overflow-hidden shadow-xl">
          <div className="p-4 border-b border-[#22262E] flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">Extrato Consolidado do Fluxo</h3>
            <span className="text-xs text-zinc-500">Ordenado por data de movimentação</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-500">Carregando fluxo de caixa...</div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500">
              Nenhuma movimentação registrada no período.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="border-b border-[#22262E] text-[11px] font-semibold uppercase tracking-wider text-zinc-500 bg-[#0D0F12]">
                  <tr>
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4">Categoria</th>
                    <th className="py-3 px-4">Conta</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Valor Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#22262E]/60">
                  {transactions.map((t) => {
                    const isIncome = t.type === 'INCOME';
                    const isExpense = t.type === 'EXPENSE';

                    return (
                      <tr key={t.id} className="hover:bg-[#1A1D23]/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-zinc-400">
                          {t.paidDate ? formatDate(t.paidDate) : t.dueDate ? formatDate(t.dueDate) : formatDate(t.createdAt)}
                        </td>
                        <td className="py-3 px-4 font-medium text-white">{t.description}</td>
                        <td className="py-3 px-4 text-zinc-400">{t.category?.name || 'Geral'}</td>
                        <td className="py-3 px-4 text-zinc-400">{t.account?.name || 'Caixa'}</td>
                        <td className="py-3 px-4">
                          {t.status === 'CONFIRMADO' || t.status === 'PAGO' || t.status === 'RECEBIDO' ? (
                            <Badge variant="success">Efetivado</Badge>
                          ) : (
                            <Badge variant="warning">Previsto</Badge>
                          )}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-mono font-bold ${
                            isIncome
                              ? 'text-emerald-400'
                              : isExpense
                              ? 'text-rose-400'
                              : 'text-purple-400'
                          }`}
                        >
                          {isIncome ? '+' : isExpense ? '-' : ''} {formatCurrency(t.netAmount || t.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
