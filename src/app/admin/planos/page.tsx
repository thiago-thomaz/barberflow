'use client';

import React, { useState, useEffect } from 'react';
import { AdminShell } from '@/components/Admin/AdminShell';
import { Package, Plus, Edit, Check, X, RefreshCw, Zap, Shield, Users, MessageSquare } from 'lucide-react';

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState({
    name: '',
    tier: '',
    price: 99.0,
    interval: 'MONTHLY',
    maxBarbers: 3,
    maxMonthlyAppointments: 300,
    hasWhatsappAutomation: true,
    hasAdvancedAnalytics: true,
    hasMultiUnit: false,
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

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setForm({
      name: '',
      tier: '',
      price: 99.0,
      interval: 'MONTHLY',
      maxBarbers: 3,
      maxMonthlyAppointments: 300,
      hasWhatsappAutomation: true,
      hasAdvancedAnalytics: true,
      hasMultiUnit: false,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plan: Plan) => {
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
    });
    setIsModalOpen(true);
  };

  const handleSavePlan = async () => {
    try {
      const url = editingPlan ? `/api/admin/plans/${editingPlan.id}` : '/api/admin/plans';
      const method = editingPlan ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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

  return (
    <AdminShell
      title="Planos & Monetização"
      subtitle="Definição de pacotes, limites operacionais por barbearia e precificação do SaaS"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={loadPlans}
            disabled={loading}
            className="p-2 rounded-xl bg-[#141824] text-slate-300 border border-[#232733]"
            title="Recarregar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
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
        {plans.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl bg-[#0E1118] border border-[#232733] p-6 shadow-sm flex flex-col justify-between hover:border-[#3A4256] transition-all"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {p.tier}
                  </span>
                  <h3 className="text-xl font-bold text-white mt-1.5">{p.name}</h3>
                </div>
                <button
                  onClick={() => handleOpenEdit(p)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#141824]"
                  title="Editar Plano"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>

              <div className="mb-6">
                <span className="text-3xl font-black text-white">R$ {p.price.toFixed(2)}</span>
                <span className="text-xs text-slate-400 font-medium"> / {p.interval === 'MONTHLY' ? 'mês' : 'ano'}</span>
              </div>

              <div className="space-y-3 text-xs border-t border-[#1C202C] pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-500" />
                    Limite de Barbeiros:
                  </span>
                  <span className="font-bold text-white font-mono">{p.maxBarbers}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-slate-500" />
                    Agendamentos / Mês:
                  </span>
                  <span className="font-bold text-white font-mono">{p.maxMonthlyAppointments}</span>
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
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#1C202C] flex items-center justify-between text-xs">
              <span className="text-slate-400">Assinantes Ativos:</span>
              <span className="font-bold text-amber-400 font-mono text-sm">
                {p._count?.subscriptions ?? 0} barbearias
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Plan Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-[#0E1118] border border-[#232733] p-6 shadow-2xl space-y-4">
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
                  className="w-full mt-1 p-2.5 rounded-xl bg-[#141824] border border-[#232733] text-white disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400">Preço Mensal (R$):</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-[#141824] border border-[#232733] text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400">Limite de Barbeiros:</label>
                <input
                  type="number"
                  value={form.maxBarbers}
                  onChange={(e) => setForm({ ...form, maxBarbers: parseInt(e.target.value) || 1 })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-[#141824] border border-[#232733] text-white"
                />
              </div>

              <div className="col-span-2">
                <label className="text-[11px] font-bold text-slate-400">Limite de Agendamentos / Mês:</label>
                <input
                  type="number"
                  value={form.maxMonthlyAppointments}
                  onChange={(e) => setForm({ ...form, maxMonthlyAppointments: parseInt(e.target.value) || 100 })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-[#141824] border border-[#232733] text-white"
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
