'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminShell } from '@/components/Admin/AdminShell';
import { AdminStatCard } from '@/components/Admin/AdminStatCard';
import {
  Store,
  TrendingUp,
  DollarSign,
  Users,
  CreditCard,
  AlertTriangle,
  Activity,
  Calendar,
  ChevronRight,
  ShieldCheck,
  LifeBuoy,
  HeartPulse,
  RefreshCw,
  Clock,
  ArrowUpRight
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/admin/dashboard');
      if (!res.ok) {
        throw new Error('Falha ao carregar métricas do dashboard');
      }
      const json = await res.json();
      setData(json.data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const formatBRL = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val || 0);
  };

  return (
    <AdminShell
      title="Central de Controle do SaaS"
      subtitle="Visão executiva unificada da operação, receita e saúde do BarberFlow"
      actions={
        <button
          onClick={loadDashboard}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#141824] hover:bg-[#1C2130] text-xs font-semibold text-slate-300 border border-[#232733] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          <span>Atualizar</span>
        </button>
      }
    >
      {error && (
        <div className="mb-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs font-bold text-rose-400">
          {error}
        </div>
      )}

      {/* Row 1: Key Executive KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-6 sm:mb-8">
        <AdminStatCard
          title="MRR (Receita Recorrente)"
          value={formatBRL(data?.financial?.mrr)}
          subtitle={`ARR Estimado: ${formatBRL(data?.financial?.arr)}`}
          icon={TrendingUp}
          href="/admin/financeiro"
          badge={{ text: 'Recorrente', variant: 'warning' }}
        />

        <AdminStatCard
          title="Barbearias Ativas"
          value={data?.tenants?.active ?? 0}
          subtitle={`Total: ${data?.tenants?.total ?? 0} clientes cadastrados`}
          icon={Store}
          href="/admin/barbearias"
          badge={{ text: `${data?.tenants?.inactive ?? 0} suspensas`, variant: data?.tenants?.inactive > 0 ? 'danger' : 'neutral' }}
        />

        <AdminStatCard
          title="Assinaturas em Teste (Trial)"
          value={data?.subscriptions?.trialing ?? 0}
          subtitle={`Retenção: ${data?.subscriptions?.retentionRate ?? 0}%`}
          icon={CreditCard}
          href="/admin/assinaturas"
          badge={{ text: 'Em Avaliação', variant: 'info' }}
        />

        <AdminStatCard
          title="Inadimplência / Pendente"
          value={formatBRL(data?.financial?.pastDueAmount)}
          subtitle={`${data?.subscriptions?.pastDue ?? 0} contas pendentes`}
          icon={AlertTriangle}
          href="/admin/pagamentos"
          badge={{ text: data?.subscriptions?.pastDue > 0 ? 'Atenção' : 'Normal', variant: data?.subscriptions?.pastDue > 0 ? 'danger' : 'success' }}
        />
      </div>

      {/* Row 2: SaaS Growth & Subscription Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6 sm:mb-8">
        {/* Growth Block */}
        <div className="rounded-2xl bg-[#0E1118] border border-[#232733] p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#1C202C] mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              Crescimento de Barbearias
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Tempo Real</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-[#141824] border border-[#232733]">
              <p className="text-[11px] text-slate-400 font-medium">Hoje</p>
              <p className="text-xl font-black text-white mt-0.5">+{data?.tenants?.growth?.today ?? 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#141824] border border-[#232733]">
              <p className="text-[11px] text-slate-400 font-medium">Últimos 7 dias</p>
              <p className="text-xl font-black text-white mt-0.5">+{data?.tenants?.growth?.sevenDays ?? 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#141824] border border-[#232733]">
              <p className="text-[11px] text-slate-400 font-medium">Últimos 30 dias</p>
              <p className="text-xl font-black text-white mt-0.5">+{data?.tenants?.growth?.thirtyDays ?? 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#141824] border border-[#232733]">
              <p className="text-[11px] text-slate-400 font-medium">Mês Atual</p>
              <p className="text-xl font-black text-amber-400 mt-0.5">+{data?.tenants?.growth?.thisMonth ?? 0}</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1C202C] flex items-center justify-between text-xs">
            <span className="text-slate-400">Mês anterior:</span>
            <span className="font-bold text-slate-300">+{data?.tenants?.growth?.lastMonth ?? 0} novas contas</span>
          </div>
        </div>

        {/* Subscriptions Status Breakdown */}
        <div className="rounded-2xl bg-[#0E1118] border border-[#232733] p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#1C202C] mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-sky-400" />
              Status de Assinaturas
            </h3>
            <Link href="/admin/assinaturas" className="text-xs font-semibold text-amber-400 hover:underline flex items-center gap-1">
              Ver todas <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#141824] border border-[#232733]">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="text-xs font-semibold text-slate-300">Ativas (Pagantes)</span>
              </div>
              <span className="font-mono font-bold text-emerald-400">{data?.subscriptions?.active ?? 0}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#141824] border border-[#232733]">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-400" />
                <span className="text-xs font-semibold text-slate-300">Em Período de Teste</span>
              </div>
              <span className="font-mono font-bold text-sky-400">{data?.subscriptions?.trialing ?? 0}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#141824] border border-[#232733]">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="text-xs font-semibold text-slate-300">Vencidas / Inadimplentes</span>
              </div>
              <span className="font-mono font-bold text-amber-400">{data?.subscriptions?.pastDue ?? 0}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#141824] border border-[#232733]">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span className="text-xs font-semibold text-slate-300">Canceladas (Churn)</span>
              </div>
              <span className="font-mono font-bold text-rose-400">{data?.subscriptions?.cancelled ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Global Operational Metrics */}
        <div className="rounded-2xl bg-[#0E1118] border border-[#232733] p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#1C202C] mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Volume Operacional da Rede
            </h3>
            <span className="text-[11px] font-mono text-slate-400">Total acumulado</span>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-[#141824] border border-[#232733] flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 font-medium">Agendamentos Realizados</p>
                <p className="text-lg font-black text-white mt-0.5">{data?.operation?.totalAppointments ?? 0}</p>
              </div>
              <Calendar className="w-6 h-6 text-amber-400/60" />
            </div>

            <div className="p-3 rounded-xl bg-[#141824] border border-[#232733] flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 font-medium">Clientes Finais na Base</p>
                <p className="text-lg font-black text-white mt-0.5">{data?.operation?.totalCustomers ?? 0}</p>
              </div>
              <Users className="w-6 h-6 text-sky-400/60" />
            </div>

            <div className="p-3 rounded-xl bg-[#141824] border border-[#232733] flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400 font-medium">Usuários Operadores / Barbeiros</p>
                <p className="text-lg font-black text-white mt-0.5">{data?.operation?.totalUsers ?? 0}</p>
              </div>
              <ShieldCheck className="w-6 h-6 text-emerald-400/60" />
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Recent Barbershops & Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Barbershops Table */}
        <div className="rounded-2xl bg-[#0E1118] border border-[#232733] p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#1C202C] mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Store className="w-4 h-4 text-amber-400" />
              Barbearias Recentes
            </h3>
            <Link href="/admin/barbearias" className="text-xs font-semibold text-amber-400 hover:underline flex items-center gap-1">
              Ver todas <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {(!data?.recentBarbershops || data.recentBarbershops.length === 0) ? (
              <p className="text-xs text-slate-500 py-6 text-center">Nenhuma barbearia cadastrada recentemente.</p>
            ) : (
              data.recentBarbershops.map((shop: any) => {
                const sub = shop.subscriptions[0];
                return (
                  <Link
                    key={shop.id}
                    href={`/admin/barbearias/${shop.id}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#141824] border border-[#232733] hover:border-[#343B4E] transition-all group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">
                          {shop.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-slate-800 text-slate-400">
                          {shop.slug}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {shop._count?.barbers ?? 0} barbeiros • {shop._count?.appointments ?? 0} agendamentos
                      </p>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                          shop.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        }`}>
                          {shop.isActive ? 'Ativa' : 'Suspensa'}
                        </span>
                        {sub?.plan && (
                          <p className="text-[10px] text-amber-400 font-semibold mt-0.5">Plano {sub.plan.name}</p>
                        )}
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Admin Audit Logs */}
        <div className="rounded-2xl bg-[#0E1118] border border-[#232733] p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#1C202C] mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-400" />
              Últimas Ações Administrativas
            </h3>
            <Link href="/admin/auditoria" className="text-xs font-semibold text-amber-400 hover:underline flex items-center gap-1">
              Ver log completo <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {(!data?.recentAuditLogs || data.recentAuditLogs.length === 0) ? (
              <p className="text-xs text-slate-500 py-6 text-center">Nenhuma ação registrada ainda.</p>
            ) : (
              data.recentAuditLogs.map((log: any) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-[#141824] border border-[#232733] text-xs flex items-start justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-400 font-mono text-[11px]">{log.action}</span>
                      <span className="text-slate-400">• {log.entity}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Executado por: <span className="text-white font-medium">{log.adminUser?.name || 'Admin'}</span>
                      {log.tenant && <span> na barbearia <span className="text-white font-medium">{log.tenant.name}</span></span>}
                    </p>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3" />
                    {new Date(log.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
