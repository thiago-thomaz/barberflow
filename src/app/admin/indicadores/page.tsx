'use client';

import React, { useState, useEffect } from 'react';
import { AdminShell } from '@/components/Admin/AdminShell';
import { AdminStatCard } from '@/components/Admin/AdminStatCard';
import {
  BarChart3,
  TrendingUp,
  Users,
  Repeat,
  Activity,
  MessageSquare,
  Sparkles,
  BookOpen,
  RefreshCw
} from 'lucide-react';

export default function AdminIndicadoresPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadMetrics = async () => {
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
    loadMetrics();
  }, []);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  return (
    <AdminShell
      title="Indicadores & KPIs do SaaS"
      subtitle="Análise profunda de aquisição, retenção, métricas unitárias e engajamento com o produto"
      actions={
        <button
          onClick={loadMetrics}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#141824] hover:bg-[#1C2130] text-xs font-semibold text-slate-300 border border-[#232733]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          <span>Atualizar KPIs</span>
        </button>
      }
    >
      {/* Group 1: Unit Economics & Retention */}
      <div className="mb-8">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          Unit Economics & Retenção
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <AdminStatCard
            title="LTV Estimado"
            value={formatBRL(data?.financial?.ltv)}
            subtitle="Valor estimado por ciclo de vida"
            icon={TrendingUp}
            badge={{ text: 'LTV', variant: 'warning' }}
          />

          <AdminStatCard
            title="Taxa de Churn"
            value={`${data?.retention?.churnRate ?? 0}%`}
            subtitle={`${data?.retention?.cancelledCount ?? 0} cancelamentos históricos`}
            icon={Repeat}
            badge={{ text: data?.retention?.churnRate > 5 ? 'Atenção' : 'Saudável', variant: data?.retention?.churnRate > 5 ? 'danger' : 'success' }}
          />

          <AdminStatCard
            title="Taxa de Retenção"
            value={`${data?.retention?.retentionRate ?? 0}%`}
            subtitle={`${data?.retention?.activeCount ?? 0} assinantes ativos`}
            icon={Users}
            badge={{ text: 'Retenção', variant: 'info' }}
          />

          <AdminStatCard
            title="ARPU (Ticket Médio)"
            value={formatBRL(data?.financial?.arpu)}
            subtitle="Receita média por barbearia"
            icon={BarChart3}
          />
        </div>
      </div>

      {/* Group 2: Product Engagement */}
      <div>
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-sky-400" />
          Adoção de Recursos do Produto
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="rounded-2xl bg-[#0E1118] border border-[#232733] p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Agendamentos Totais</span>
              <Activity className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-white">{data?.engagement?.totalAppointments ?? 0}</p>
            <p className="text-[11px] text-emerald-400 font-bold mt-1">
              {data?.engagement?.completionRate ?? 0}% concluídos com sucesso
            </p>
          </div>

          <div className="rounded-2xl bg-[#0E1118] border border-[#232733] p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Mensagens WhatsApp</span>
              <MessageSquare className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-white">{data?.engagement?.totalWhatsAppMessages ?? 0}</p>
            <p className="text-[11px] text-slate-400 mt-1">Lembretes & Atendimentos</p>
          </div>

          <div className="rounded-2xl bg-[#0E1118] border border-[#232733] p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Sessões de Visagismo</span>
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-2xl font-black text-white">{data?.engagement?.totalVisagismSessions ?? 0}</p>
            <p className="text-[11px] text-purple-400 mt-1">Simulações de visual</p>
          </div>

          <div className="rounded-2xl bg-[#0E1118] border border-[#232733] p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400">Diagnósticos Academia</span>
              <BookOpen className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-2xl font-black text-white">{data?.engagement?.totalAcademyDiagnostics ?? 0}</p>
            <p className="text-[11px] text-sky-400 mt-1">Planos de Ação criados</p>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
