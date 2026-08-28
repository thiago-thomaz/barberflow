'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { StatCard } from '@/components/UI/StatCard';
import { Badge } from '@/components/UI/Badge';
import { formatCurrency, formatTime, formatDate } from '@/lib/utils';
import {
  Calendar,
  DollarSign,
  TrendingUp,
  Users,
  Flame,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Scissors,
  Plus,
  ArrowRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard');
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
    fetchDashboardData();
  }, []);

  const kpis = data?.kpis;
  const recurrence = data?.recurrence;
  const alerts = data?.alerts || [];
  const upcoming = data?.upcomingToday || [];

  return (
    <AppShell
      title="Painel de Controle"
      subtitle="Visão geral da operação de hoje, faturamento e oportunidades de recorrência"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#14171C] border border-[#22262E] text-xs font-semibold text-zinc-300">
            <Calendar className="h-3.5 w-3.5 text-amber-400" />
            <span className="capitalize">
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
          <Link
            href="/recorrencia"
            className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-all shadow-sm"
          >
            <Flame className="h-3.5 w-3.5" />
            <span>Dinheiro na Mesa</span>
          </Link>
          <Link
            href="/agenda"
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-bold text-black shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Agendamento</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Smart Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((alert: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-300 shadow-sm"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="font-medium">{alert.message}</span>
                </div>
                {alert.actionUrl && (
                  <Link
                    href={alert.actionUrl}
                    className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:underline shrink-0 ml-3"
                  >
                    <span>Ver detalhes</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}

        {/* SECTION 1: Operação de Hoje */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-amber-400" />
              Operação de Hoje
            </h2>
            <span className="text-xs text-zinc-500">
              {new Date().toLocaleDateString('pt-BR', { dateStyle: 'long' })}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Faturamento Realizado Hoje"
              value={formatCurrency(kpis?.revenueRealizedToday || 0)}
              subtitle={`Previsto total: ${formatCurrency(kpis?.revenueForecastToday || 0)}`}
              icon={DollarSign}
              highlight="emerald"
            />
            <StatCard
              title="Atendimentos Hoje"
              value={`${kpis?.todayCompleted || 0} / ${kpis?.todayTotal || 0}`}
              subtitle={`${kpis?.openSlotsCount || 0} horários livres`}
              icon={Scissors}
              highlight="blue"
            />
            <StatCard
              title="Dinheiro Deixado na Mesa"
              value={formatCurrency(recurrence?.totalOpportunity || 0)}
              subtitle={`${recurrence?.countAtRisk || 0} clientes em risco`}
              icon={Flame}
              highlight="gold"
            />
            <StatCard
              title="Taxa de Retenção"
              value={`${recurrence?.retentionRate || 0}%`}
              subtitle={`${recurrence?.countActive || 0} clientes recorrentes`}
              icon={CheckCircle2}
              highlight="none"
            />
          </div>
        </div>

        {/* SECTION 2: Próximos Atendimentos & Retenção Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Schedule (2 cols) */}
          <div className="lg:col-span-2 rounded-xl border border-[#22262E] bg-[#14171C] p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#22262E] pb-3">
              <div>
                <h3 className="font-bold text-white text-sm">Próximos Atendimentos de Hoje</h3>
                <p className="text-xs text-zinc-400">Fila em tempo real de clientes na barbearia</p>
              </div>
              <Link
                href="/agenda"
                className="text-xs font-semibold text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>Ver agenda completa</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-zinc-500">Carregando horários...</div>
            ) : upcoming.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Clock className="h-7 w-7 mx-auto text-zinc-600" />
                <p className="text-xs text-zinc-400">
                  Nenhum próximo agendamento pendente para hoje.
                </p>
                <Link
                  href="/agenda"
                  className="inline-flex items-center gap-1 text-xs text-amber-400 font-bold hover:underline"
                >
                  <Plus className="h-3 w-3" /> Agendar novo cliente
                </Link>
              </div>
            ) : (
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {upcoming.map((app: any) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[#0D0F12] border border-[#22262E] hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 text-xs font-mono font-bold text-amber-400">
                        {formatTime(app.scheduledAt)}
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs">{app.customer?.name}</div>
                        <div className="text-[11px] text-zinc-400">
                          {app.service?.name} • ✂️ {app.barber?.name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-bold text-emerald-400 text-xs">
                        {formatCurrency(app.price)}
                      </span>
                      <Badge status={app.status} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Recurrence Card (1 col) */}
          <div className="rounded-xl border border-amber-500/25 bg-gradient-to-b from-amber-500/10 to-[#14171C] p-5 shadow-xl flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5" />
                  Alavanca de Recorrência
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded border border-amber-500/30">
                  Alta Prioridade
                </span>
              </div>

              <h3 className="text-lg font-extrabold text-white">
                Quem trazer para a cadeira hoje?
              </h3>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Você tem <strong>{recurrence?.countAtRisk || 0} clientes</strong> que já passaram do
                tempo habitual de corte e <strong>{recurrence?.countDueForReturn || 0}</strong> que
                costumam cortar nesta semana.
              </p>

              <div className="rounded-lg bg-zinc-900/90 border border-zinc-800 p-3 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Receita Recuperável:</span>
                  <span className="font-bold text-emerald-400">
                    {formatCurrency(recurrence?.totalOpportunity || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Clientes em Risco:</span>
                  <span className="font-bold text-rose-400">{recurrence?.countAtRisk || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Clientes Inativos:</span>
                  <span className="font-bold text-zinc-300">{recurrence?.countInactive || 0}</span>
                </div>
              </div>
            </div>

            <Link
              href="/recorrencia"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-xs font-bold text-black shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all"
            >
              <span>Abrir Lista de Reativação</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
