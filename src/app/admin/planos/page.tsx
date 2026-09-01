'use client';

import React, { useState, useEffect } from 'react';
import { AdminShell } from '@/components/Admin/AdminShell';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  RefreshCw,
  Zap,
  Shield,
  Users,
  MessageSquare,
  Building2,
  Star,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  tier: string;
  price: number;
  interval: string;
  maxBarbers: number;
  maxMonthlyAppointments: number;
  hasWhatsappAutomation: boolean;
  hasAdvancedAnalytics: boolean;
  hasMultiUnit: boolean;
  featuresJson: string | null;
  _count?: {
    subscriptions: number;
  };
}

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState({
    name: '',
    tier: '',
    price: 59.0,
    interval: 'MONTHLY',
    maxBarbers: 2,
    maxMonthlyAppointments: 500,
    hasWhatsappAutomation: false,
    hasAdvancedAnalytics: false,
    hasMultiUnit: false,
    featuresText: '',
  });
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/plans');
      if (!res.ok) throw new Error('Erro ao carregar planos');
      const json = await res.json();
      setPlans(json.data || []);
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleSyncOfficial = async () => {
    try {
      setSyncing(true);
      const res = await fetch('/api/admin/plans/sync', { method: 'POST' });
      if (!res.ok) throw new Error('Erro ao sincronizar planos oficiais');
      const json = await res.json();
      setFeedback({
        type: 'success',
        message: 'Planos oficiais sincronizados com sucesso (Starter R$ 59, Profissional R$ 119, Redes & Franquias R$ 229)!',
      });
      loadPlans();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setForm({
      name: '',
      tier: '',
      price: 59.0,
      interval: 'MONTHLY',
      maxBarbers: 2,
      maxMonthlyAppointments: 500,
      hasWhatsappAutomation: false,
      hasAdvancedAnalytics: false,
      hasMultiUnit: false,
      featuresText: 'Até 2 Barbeiros\nAgenda e Agendamento Público\nMotor de Recorrência Básico\nGestão de Clientes',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plan: Plan) => {
    let featuresText = '';
    if (plan.featuresJson) {
      try {
        const parsed = JSON.parse(plan.featuresJson);
        if (Array.isArray(parsed)) {
          featuresText = parsed.join('\n');
        }
      } catch {
        featuresText = plan.featuresJson;
      }
    }

    setEditingPlan(plan);
    setForm({
      name: plan.name,
      tier: plan.tier,
      price: plan.price,
      interval: plan.interval,
      maxBarbers: plan.maxBarbers,
      maxMonthlyAppointments: plan.maxMonthlyAppointments,
      hasWhatsappAutomation: plan.hasWhatsappAutomation,
      hasAdvancedAnalytics: plan.hasAdvancedAnalytics,
      hasMultiUnit: plan.hasMultiUnit,
      featuresText,
    });
    setIsModalOpen(true);
  };

  const handleSavePlan = async () => {
    try {
      const url = editingPlan ? `/api/admin/plans/${editingPlan.id}` : '/api/admin/plans';
      const method = editingPlan ? 'PATCH' : 'POST';

      const featuresArray = form.featuresText
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);

      const payload = {
        name: form.name,
        tier: form.tier,
        price: form.price,
        interval: form.interval,
        maxBarbers: form.maxBarbers,
        maxMonthlyAppointments: form.maxMonthlyAppointments,
        hasWhatsappAutomation: form.hasWhatsappAutomation,
        hasAdvancedAnalytics: form.hasAdvancedAnalytics,
        hasMultiUnit: form.hasMultiUnit,
        featuresJson: JSON.stringify(featuresArray),
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Erro ao salvar plano');
      }

      setFeedback({
        type: 'success',
        message: `Plano ${form.name} salvo com sucesso!`,
      });
      setIsModalOpen(false);
      loadPlans();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleDeletePlan = async (plan: Plan) => {
    if (!confirm(`Deseja realmente excluir o plano ${plan.name} (${plan.tier})?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/plans/${plan.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao excluir plano');

      setFeedback({ type: 'success', message: json.message });
      loadPlans();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const parseFeatures = (json: string | null): string[] => {
    if (!json) return [];
    try {
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  return (
    <AdminShell
      title="Planos & Monetização"
      subtitle="Definição de pacotes, limites operacionais por barbearia e precificação oficial do SaaS"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={loadPlans}
            disabled={loading}
            className="p-2 rounded-xl bg-[#141824] text-slate-300 border border-[#232733] hover:text-white"
            title="Recarregar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleSyncOfficial}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1E2333] hover:bg-[#282F45] text-xs font-bold text-amber-400 border border-amber-500/30 transition-all"
            title="Sincronizar com os 3 planos oficiais da Landing Page"
          >
            <Sparkles className={`w-4 h-4 ${syncing ? 'animate-spin text-amber-400' : 'text-amber-400'}`} />
            <span>Sincronizar Planos Oficiais</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-black shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Plano</span>
          </button>
        </div>
      }
    >
      {feedback && (
        <div
          className={`mb-6 rounded-2xl p-4 text-xs font-bold border ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {plans.map((p) => {
          const isHighlighted = p.tier === 'PRO' || p.tier === 'PROFISSIONAL';
          const features = parseFeatures(p.featuresJson);

          return (
            <div
              key={p.id}
              className={`rounded-2xl border p-6 shadow-sm flex flex-col justify-between transition-all relative ${
                isHighlighted
                  ? 'bg-gradient-to-b from-amber-500/10 via-[#0E1118] to-[#0E1118] border-amber-500 shadow-amber-500/10 shadow-xl'
                  : 'bg-[#0E1118] border-[#232733] hover:border-[#3A4256]'
              }`}
            >
              {isHighlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[10px] font-black uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md flex items-center gap-1">
                  <Star className="w-3 h-3 fill-black" />
                  <span>Mais Escolhido</span>
                </div>
              )}

              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {p.tier}
                    </span>
                    <h3 className="text-xl font-bold text-white mt-1.5">{p.name}</h3>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#141824]"
                      title="Editar Plano"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeletePlan(p)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                      title="Excluir Plano"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mb-5">
                  <span className={`text-3xl font-black ${isHighlighted ? 'text-amber-400' : 'text-white'}`}>
                    R$ {p.price.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {' '}
                    / {p.interval === 'MONTHLY' ? 'mês' : 'ano'}
                  </span>
                </div>

                {/* Features List */}
                {features.length > 0 && (
                  <div className="mb-5 space-y-2 border-t border-[#1C202C] pt-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      Itens Inclusos:
                    </span>
                    {features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Technical Parameters */}
                <div className="space-y-2.5 text-xs border-t border-[#1C202C] pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-slate-500" />
                      Limite de Barbeiros:
                    </span>
                    <span className="font-bold text-white font-mono">
                      {p.maxBarbers >= 999 ? 'Ilimitados' : p.maxBarbers}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-slate-500" />
                      Agendamentos / Mês:
                    </span>
                    <span className="font-bold text-white font-mono">
                      {p.maxMonthlyAppointments >= 10000 ? 'Ilimitados' : p.maxMonthlyAppointments}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-slate-500" />
                      WhatsApp Automação:
                    </span>
                    <span className={`font-bold ${p.hasWhatsappAutomation ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {p.hasWhatsappAutomation ? 'Incluso' : 'Não incluso'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-slate-500" />
                      Analytics Avançado:
                    </span>
                    <span className={`font-bold ${p.hasAdvancedAnalytics ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {p.hasAdvancedAnalytics ? 'Incluso' : 'Não incluso'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-slate-500" />
                      Multi-Unidades / Tenants:
                    </span>
                    <span className={`font-bold ${p.hasMultiUnit ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {p.hasMultiUnit ? 'Incluso' : 'Não incluso'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#1C202C] flex items-center justify-between text-xs">
                <span className="text-slate-400">Assinantes Ativos:</span>
                <span className="font-bold text-amber-400 font-mono text-sm">
                  {p._count?.subscriptions ?? 0} barbearias
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-[#0E1118] border border-[#232733] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-white">
              {editingPlan ? `Editar Plano: ${editingPlan.name}` : 'Criar Novo Plano de Assinatura'}
            </h3>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-400">Nome do Plano:</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ex: Profissional"
                  className="w-full mt-1 p-2.5 rounded-xl bg-[#141824] border border-[#232733] text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400">Identificador (Tier):</label>
                <input
                  type="text"
                  value={form.tier}
                  disabled={!!editingPlan}
                  onChange={(e) => setForm({ ...form, tier: e.target.value })}
                  placeholder="Ex: PRO"
                  className="w-full mt-1 p-2.5 rounded-xl bg-[#141824] border border-[#232733] text-white disabled:opacity-50 font-mono uppercase"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400">Preço Mensal (R$):</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-[#141824] border border-[#232733] text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400">Intervalo:</label>
                <select
                  value={form.interval}
                  onChange={(e) => setForm({ ...form, interval: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-[#141824] border border-[#232733] text-white"
                >
                  <option value="MONTHLY">Mensal</option>
                  <option value="YEARLY">Anual</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400">Limite de Barbeiros:</label>
                <input
                  type="number"
                  value={form.maxBarbers}
                  onChange={(e) => setForm({ ...form, maxBarbers: parseInt(e.target.value) || 1 })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-[#141824] border border-[#232733] text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400">Limite de Agendamentos / Mês:</label>
                <input
                  type="number"
                  value={form.maxMonthlyAppointments}
                  onChange={(e) => setForm({ ...form, maxMonthlyAppointments: parseInt(e.target.value) || 100 })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-[#141824] border border-[#232733] text-white font-mono"
                />
              </div>

              <div className="col-span-2">
                <label className="text-[11px] font-bold text-slate-400">
                  Itens e Benefícios Inclusos (1 por linha):
                </label>
                <textarea
                  rows={4}
                  value={form.featuresText}
                  onChange={(e) => setForm({ ...form, featuresText: e.target.value })}
                  placeholder="Até 2 Barbeiros&#10;Agenda e Agendamento Público&#10;Motor de Recorrência Básico&#10;Gestão de Clientes"
                  className="w-full mt-1 p-2.5 rounded-xl bg-[#141824] border border-[#232733] text-white font-mono text-xs"
                />
              </div>

              <div className="col-span-2 space-y-2 pt-2 border-t border-[#1C202C]">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.hasWhatsappAutomation}
                    onChange={(e) => setForm({ ...form, hasWhatsappAutomation: e.target.checked })}
                    className="rounded bg-[#141824] text-amber-500"
                  />
                  <span className="text-white font-medium">Habilitar Automações do WhatsApp</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.hasAdvancedAnalytics}
                    onChange={(e) => setForm({ ...form, hasAdvancedAnalytics: e.target.checked })}
                    className="rounded bg-[#141824] text-amber-500"
                  />
                  <span className="text-white font-medium">Habilitar Indicadores Financeiros & Relatórios Avançados</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.hasMultiUnit}
                    onChange={(e) => setForm({ ...form, hasMultiUnit: e.target.checked })}
                    className="rounded bg-[#141824] text-amber-500"
                  />
                  <span className="text-white font-medium">Habilitar Gestão Multi-Unidades / Franquias</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#232733]">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePlan}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20"
              >
                Salvar Plano
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
