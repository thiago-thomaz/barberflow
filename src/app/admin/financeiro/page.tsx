'use client';

import React, { useState, useEffect } from 'react';
import { AdminShell } from '@/components/Admin/AdminShell';
import { AdminStatCard } from '@/components/Admin/AdminStatCard';
import { TrendingUp, DollarSign, AlertTriangle, CreditCard, RefreshCw, BarChart3, ArrowUpRight } from 'lucide-react';

export default function AdminFinanceiroPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/metrics');
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinancialData();
  }, []);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  return (
    <AdminShell
      title="Financeiro do SaaS"
      subtitle="Demonstrativo de Receita Recorrente (MRR), faturamento realizado, ARPU e inadimplência"
      actions={
        <button
          onClick={loadFinancialData}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#141824] hover:bg-[#1C2130] text-xs font-semibold text-slate-300 border border-[#232733]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          <span>Atualizar</span>
        </button>
      }
    >
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <AdminStatCard
          title="MRR (Receita Recorrente)"
          value={formatBRL(data?.financial?.mrr)}
          subtitle="Soma das assinaturas ativas"
          icon={TrendingUp}
          badge={{ text: 'Mensal', variant: 'warning' }}
        />

        <AdminStatCard
          title="ARR (Projeção Anual)"
          value={formatBRL(data?.financial?.arr)}
          subtitle="MRR anualizado x 12"
          icon={DollarSign}
          badge={{ text: 'Anual', variant: 'info' }}
        />

        <AdminStatCard
          title="ARPU (Ticket Médio)"
          value={formatBRL(data?.financial?.arpu)}
          subtitle="Receita média por barbearia ativa"
          icon={CreditCard}
        />

        <AdminStatCard
          title="Inadimplência (Past Due)"
          value={formatBRL(data?.financial?.pastDueAmount)}
          subtitle={`Taxa de inadimplência: ${data?.financial?.defaultRate ?? 0}%`}
          icon={AlertTriangle}
          badge={{ text: data?.financial?.defaultRate > 0 ? 'Atenção' : 'Excelente', variant: data?.financial?.defaultRate > 0 ? 'danger' : 'success' }}
        />
      </div>

      {/* Breakdown by Plans */}
      <div className="rounded-2xl bg-[#0E1118] border border-[#232733] p-6 shadow-sm mb-8">
        <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-amber-400" />
          Composição da Receita Recorrente por Plano
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(!data?.planDistribution || data.planDistribution.length === 0) ? (
            <p className="text-xs text-slate-500 py-6 text-center col-span-3">Nenhum plano configurado.</p>
          ) : (
            data.planDistribution.map((plan: any) => (
              <div key={plan.id} className="p-4 rounded-xl bg-[#141824] border border-[#232733] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{plan.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-amber-500/20 text-amber-300">
                    {plan.tier}
                  </span>
                </div>
                <p className="text-xs text-slate-400">Preço: {formatBRL(plan.price)} / mês</p>
                <div className="pt-2 border-t border-[#1C202C] flex items-center justify-between text-xs">
                  <span className="text-slate-400">{plan.subscribersCount} assinantes</span>
                  <span className="font-bold text-emerald-400 font-mono">{formatBRL(plan.estimatedMrr)}/mês</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminShell>
  );
}
