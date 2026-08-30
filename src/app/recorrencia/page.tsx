'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/AppShell';
import { StatCard } from '@/components/UI/StatCard';
import { Badge } from '@/components/UI/Badge';
import { Modal } from '@/components/UI/Modal';
import { formatCurrency, formatDate, formatPhone } from '@/lib/utils';
import {
  Flame,
  AlertTriangle,
  Clock,
  DollarSign,
  MessageSquare,
  RefreshCw,
  Send,
  ExternalLink,
  Users,
  CheckCircle2,
  Sparkles,
  Calendar,
} from 'lucide-react';

export default function RecorrenciaPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'at-risk' | 'due' | 'inactive'>('at-risk');

  const [atRiskList, setAtRiskList] = useState<any[]>([]);
  const [dueList, setDueList] = useState<any[]>([]);
  const [inactiveList, setInactiveList] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);

  // WhatsApp Message Modal
  const [selectedCustomerForMessage, setSelectedCustomerForMessage] = useState<any | null>(null);
  const [customMessage, setCustomMessage] = useState('');

  const fetchAllRecurrenceData = async () => {
    try {
      setLoading(true);
      const [recovRes, riskRes, dueRes, inactRes] = await Promise.all([
        fetch('/api/recurrence/recovery'),
        fetch('/api/recurrence/at-risk'),
        fetch('/api/recurrence/due-for-return'),
        fetch('/api/recurrence/inactive'),
      ]);

      const [recovData, riskData, dueData, inactData] = await Promise.all([
        recovRes.json(),
        riskRes.json(),
        dueRes.json(),
        inactRes.json(),
      ]);

      if (recovRes.ok) setMetrics(recovData.metrics);
      if (riskRes.ok) setAtRiskList(riskData.customers || []);
      if (dueRes.ok) setDueList(dueData.customers || []);
      if (inactRes.ok) setInactiveList(inactData.customers || []);
    } catch (err) {
      console.error('Error fetching recurrence data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllRecurrenceData();
  }, []);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const res = await fetch('/api/recurrence/recalculate', { method: 'POST' });
      if (res.ok) {
        await fetchAllRecurrenceData();
      }
    } finally {
      setRecalculating(false);
    }
  };

  const openWhatsAppModal = (customer: any) => {
    setSelectedCustomerForMessage(customer);
    setCustomMessage(customer.suggestedMessage || '');
  };

  const sendWhatsApp = () => {
    if (!selectedCustomerForMessage) return;
    const cleanPhone = selectedCustomerForMessage.phone.replace(/\D/g, '');
    const url = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(customMessage)}`;
    window.open(url, '_blank');
    setSelectedCustomerForMessage(null);
  };

  return (
    <AppShell
      title="Motor de Recorrência & Retenção"
      subtitle="Identifique clientes sumindo e recupere receita deixada na mesa"
      actions={
        <button
          onClick={handleRecalculate}
          disabled={recalculating || loading}
          className="flex items-center gap-2 rounded-lg bg-zinc-800 border border-zinc-700 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-700 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${recalculating ? 'animate-spin text-amber-400' : ''}`} />
          <span>{recalculating ? 'Calculando...' : 'Recalcular Métricas'}</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* BIG HERO CARD: Dinheiro Deixado na Mesa */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-[#1A1D23] to-[#121418] p-6 sm:p-8 shadow-2xl glow-gold">
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold text-amber-400 border border-amber-500/40">
                <Flame className="h-3.5 w-3.5" />
                <span>Oportunidade Comercial de Retenção</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Dinheiro Deixado na Mesa
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 max-w-xl">
                Estimativa de receita que sua barbearia pode recuperar ativamente reativando clientes
                que passaram do intervalo habitual de corte.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl border border-amber-500/40 bg-zinc-900/90 p-4 text-right min-w-[190px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                  Receita em Oportunidade
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 block mt-0.5">
                  {formatCurrency(metrics?.totalOpportunity || 0)}
                </span>
                <span className="text-[10px] text-zinc-400 mt-0.5 block">
                  {metrics?.countAtRisk || 0} em risco + {metrics?.countInactive || 0} inativos
                </span>
              </div>

              <div className="rounded-xl border border-emerald-500/40 bg-zinc-900/90 p-4 text-right min-w-[190px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                  Receita Recuperada Real
                </span>
                <span className="text-2xl sm:text-3xl font-extrabold text-white block mt-0.5">
                  {formatCurrency(metrics?.totalRecovered || 0)}
                </span>
                <span className="text-[10px] text-emerald-400/90 mt-0.5 block">
                  Taxa de Recuperação: {metrics?.recoveryRate || 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Clientes em Risco"
            value={metrics?.countAtRisk || 0}
            subtitle="Passaram do ciclo habitual"
            icon={AlertTriangle}
            highlight="rose"
          />
          <StatCard
            title="Próximos de Voltar"
            value={metrics?.countDueForReturn || 0}
            subtitle="Ciclo habitual nos próximos dias"
            icon={Clock}
            highlight="gold"
          />
          <StatCard
            title="Clientes Inativos"
            value={metrics?.countInactive || 0}
            subtitle="Mais de 2x o ciclo sem voltar"
            icon={Users}
            highlight="none"
          />
          <StatCard
            title="Taxa de Retenção"
            value={`${metrics?.retentionRate || 0}%`}
            subtitle="Clientes ativos e recorrentes"
            icon={CheckCircle2}
            highlight="emerald"
          />
        </div>

        {/* Action Tabs and Lists */}
        <div className="rounded-xl border border-[#22262E] bg-[#14171C] overflow-hidden shadow-xl">
          {/* Tabs header */}
          <div className="flex border-b border-[#22262E] bg-[#101216] px-4 pt-3 overflow-x-auto">
            <button
              onClick={() => setActiveTab('at-risk')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'at-risk'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Clientes em Risco ({atRiskList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('due')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'due'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Próximos de Voltar ({dueList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('inactive')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                activeTab === 'inactive'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Inativos para Recuperar ({inactiveList.length})</span>
            </button>
          </div>

          {/* TAB 1: Clientes em Risco (Dinheiro na Mesa) */}
          {activeTab === 'at-risk' && (
            <div className="p-4">
              {loading ? (
                <div className="p-12 text-center text-xs text-zinc-500">
                  Carregando clientes em risco...
                </div>
              ) : atRiskList.length === 0 ? (
                <div className="p-12 text-center text-xs text-zinc-500">
                  Parabéns! Nenhum cliente em risco no momento.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="border-b border-[#22262E] text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      <tr>
                        <th className="pb-3 px-3">Prioridade</th>
                        <th className="pb-3 px-3">Cliente</th>
                        <th className="pb-3 px-3">Última Visita</th>
                        <th className="pb-3 px-3">Ciclo Habitual</th>
                        <th className="pb-3 px-3">Dias sem Voltar</th>
                        <th className="pb-3 px-3">Receita Potencial</th>
                        <th className="pb-3 px-3 text-right">Ação Direta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#22262E]/60">
                      {atRiskList.map((c) => {
                        const prio = c.priority || (c.daysOverdue >= 10 ? 'ALTA' : c.daysOverdue >= 5 ? 'MEDIA' : 'BAIXA');
                        return (
                          <tr key={c.id} className="hover:bg-[#1A1D23]/50 transition-colors">
                            <td className="py-3 px-3">
                              {prio === 'ALTA' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  🔥 ALTA
                                </span>
                              ) : prio === 'MEDIA' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  ⚡ MÉDIA
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                                  BAIXA
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3 font-semibold text-white">
                              <div>{c.name}</div>
                              <div className="text-[11px] text-zinc-500 font-mono">
                                {formatPhone(c.phone)}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-zinc-300">
                              {c.lastVisitDate ? formatDate(c.lastVisitDate) : '-'}
                            </td>
                            <td className="py-3 px-3 text-zinc-300">
                              {c.cycleDays} dias
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-bold text-rose-400">
                                {c.daysSinceLastVisit} dias
                              </span>{' '}
                              <span className="text-[10px] text-zinc-500">
                                (+{c.daysOverdue} dias em atraso)
                              </span>
                            </td>
                            <td className="py-3 px-3 font-bold text-emerald-400">
                              {formatCurrency(c.potentialRevenue)}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <button
                                onClick={() => openWhatsAppModal(c)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/25 transition-all shadow-sm"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span>Reativar no WhatsApp</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Próximos de Voltar */}
          {activeTab === 'due' && (
            <div className="p-4">
              {loading ? (
                <div className="p-12 text-center text-xs text-zinc-500">
                  Carregando oportunidades...
                </div>
              ) : dueList.length === 0 ? (
                <div className="p-12 text-center text-xs text-zinc-500">
                  Nenhum cliente no intervalo imediato de retorno hoje.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="border-b border-[#22262E] text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      <tr>
                        <th className="pb-3 px-3">Cliente</th>
                        <th className="pb-3 px-3">Última Visita</th>
                        <th className="pb-3 px-3">Ciclo Médio</th>
                        <th className="pb-3 px-3">Previsão de Retorno</th>
                        <th className="pb-3 px-3">Status</th>
                        <th className="pb-3 px-3 text-right">Antecipar Agendamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#22262E]/60">
                      {dueList.map((c) => (
                        <tr key={c.id} className="hover:bg-[#1A1D23]/50 transition-colors">
                          <td className="py-3 px-3 font-semibold text-white">
                            <div>{c.name}</div>
                            <div className="text-[11px] text-zinc-500 font-mono">
                              {formatPhone(c.phone)}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-zinc-300">
                            {c.lastVisitDate ? formatDate(c.lastVisitDate) : '-'}
                          </td>
                          <td className="py-3 px-3 text-zinc-300">
                            {c.cycleDays} dias
                          </td>
                          <td className="py-3 px-3 font-medium text-amber-400">
                            {c.estimatedNextVisit ? formatDate(c.estimatedNextVisit) : 'Nos próximos dias'}
                          </td>
                          <td className="py-3 px-3">
                            <Badge status={c.status} size="sm" />
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => openWhatsAppModal(c)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-500/25 transition-all"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              <span>Lembrar Cliente</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Clientes Inativos */}
          {activeTab === 'inactive' && (
            <div className="p-4">
              {loading ? (
                <div className="p-12 text-center text-xs text-zinc-500">
                  Carregando inativos...
                </div>
              ) : inactiveList.length === 0 ? (
                <div className="p-12 text-center text-xs text-zinc-500">
                  Nenhum cliente inativo no momento.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="border-b border-[#22262E] text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                      <tr>
                        <th className="pb-3 px-3">Cliente</th>
                        <th className="pb-3 px-3">Última Visita</th>
                        <th className="pb-3 px-3">Dias sem Voltar</th>
                        <th className="pb-3 px-3">Total de Visitas</th>
                        <th className="pb-3 px-3">Receita Potencial</th>
                        <th className="pb-3 px-3 text-right">Campanha de Resgate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#22262E]/60">
                      {inactiveList.map((c) => (
                        <tr key={c.id} className="hover:bg-[#1A1D23]/50 transition-colors">
                          <td className="py-3 px-3 font-semibold text-white">
                            <div>{c.name}</div>
                            <div className="text-[11px] text-zinc-500 font-mono">
                              {formatPhone(c.phone)}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-zinc-300">
                            {c.lastVisitDate ? formatDate(c.lastVisitDate) : '-'}
                          </td>
                          <td className="py-3 px-3 text-zinc-400 font-medium">
                            {c.daysSinceLastVisit} dias
                          </td>
                          <td className="py-3 px-3 text-zinc-300">
                            {c.totalVisits} visitas
                          </td>
                          <td className="py-3 px-3 font-bold text-emerald-400">
                            {formatCurrency(c.potentialRevenue)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => openWhatsAppModal(c)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-1.5 text-xs font-bold text-zinc-200 hover:bg-zinc-700 transition-all"
                            >
                              <MessageSquare className="h-3.5 w-3.5 text-amber-400" />
                              <span>Enviar Oferta de Resgate</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Enviar Mensagem de Reativação */}
      <Modal
        isOpen={!!selectedCustomerForMessage}
        onClose={() => setSelectedCustomerForMessage(null)}
        title="Enviar Mensagem de Reativação"
        subtitle={`Para ${selectedCustomerForMessage?.name} (${selectedCustomerForMessage?.phone})`}
      >
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-[#0D0F12] border border-[#22262E] text-xs text-zinc-400">
            <span className="font-semibold text-amber-400 block mb-1">💡 Dica de Retenção:</span>
            Mensagens amigáveis e não agressivas geram até 3x mais conversões de agendamento.
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
              Texto da Mensagem:
            </label>
            <textarea
              rows={4}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] p-3 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none resize-none leading-relaxed"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#22262E]">
            <button
              onClick={() => setSelectedCustomerForMessage(null)}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={sendWhatsApp}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-black hover:bg-emerald-400 transition-all shadow-md"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Abrir no WhatsApp Web</span>
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
