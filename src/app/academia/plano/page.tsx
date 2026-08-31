'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { Modal } from '@/components/UI/Modal';
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  PlayCircle,
  RotateCcw,
  BookOpen,
  Wrench,
  ExternalLink,
  Plus,
  Filter,
  Check,
  AlertCircle,
  Calendar,
  BarChart3,
  Flame,
  CheckSquare,
} from 'lucide-react';
import { EducationContentItem } from '@/lib/academia/content';

interface ActionPlanItem {
  id: string;
  title: string;
  problem: string;
  whyItMatters: string;
  action: string;
  howTo: string;
  deadlineDays: number;
  targetDeadline?: string;
  indicator: string;
  recommendedCategory?: string;
  status: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO';
  completedAt?: string;
  createdAt: string;
  resolvedContents?: EducationContentItem[];
  resolvedTool?: { id: string; name: string; category: string } | null;
  resolvedChecklist?: { id: string; name: string; frequency: string } | null;
}

export default function AcademiaPlanoPage() {
  const [plans, setPlans] = useState<ActionPlanItem[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO'>('TODOS');

  // New Custom Task Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newProblem, setNewProblem] = useState('');
  const [newWhyItMatters, setNewWhyItMatters] = useState('');
  const [newAction, setNewAction] = useState('');
  const [newHowTo, setNewHowTo] = useState('');
  const [newDeadlineDays, setNewDeadlineDays] = useState(7);
  const [newIndicator, setNewIndicator] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const url = statusFilter === 'TODOS' ? '/api/academia/action-plan' : `/api/academia/action-plan?status=${statusFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPlans(data.actionPlans || []);
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching action plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, [statusFilter]);

  const updateStatus = async (id: string, newStatus: 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO') => {
    // Optimistic UI
    setPlans((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: newStatus, completedAt: newStatus === 'CONCLUIDO' ? new Date().toISOString() : undefined } : p))
    );

    try {
      await fetch(`/api/academia/action-plan/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      // Refresh stats
      const res = await fetch('/api/academia/action-plan');
      if (res.ok) {
        const data = await res.json();
        if (data.stats) setStats(data.stats);
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newProblem || !newAction) return;

    try {
      setCreating(true);
      const res = await fetch('/api/academia/action-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          problem: newProblem,
          whyItMatters: newWhyItMatters,
          action: newAction,
          howTo: newHowTo,
          deadlineDays: newDeadlineDays,
          indicator: newIndicator,
        }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setNewTitle('');
        setNewProblem('');
        setNewWhyItMatters('');
        setNewAction('');
        setNewHowTo('');
        setNewIndicator('');
        fetchPlans();
      }
    } catch (err) {
      console.error('Error creating plan:', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppShell
      title="📋 Plano de Ação da sua Barbearia"
      subtitle="Ações estratégicas, prazos, indicadores e recomendações oficiais para acelerar sua operação"
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/academia"
            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-zinc-700/60"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar à Academia</span>
          </Link>
          <Link
            href="/academia/diagnostico"
            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-400 text-xs font-bold flex items-center gap-1.5 transition-colors border border-zinc-700/60"
          >
            <span>Meu Diagnóstico</span>
          </Link>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nova Ação</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* KPI Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            onClick={() => setStatusFilter('TODOS')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all ${
              statusFilter === 'TODOS'
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                : 'bg-[#14171F] border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <span className="text-[10px] uppercase font-bold tracking-wider">Total de Ações</span>
            <div className="text-2xl font-black text-white mt-1">{stats.total}</div>
          </div>

          <div
            onClick={() => setStatusFilter('PENDENTE')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all ${
              statusFilter === 'PENDENTE'
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                : 'bg-[#14171F] border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <span className="text-[10px] uppercase font-bold tracking-wider">Pendentes</span>
            <div className="text-2xl font-black text-amber-400 mt-1">{stats.pending}</div>
          </div>

          <div
            onClick={() => setStatusFilter('EM_ANDAMENTO')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all ${
              statusFilter === 'EM_ANDAMENTO'
                ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                : 'bg-[#14171F] border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <span className="text-[10px] uppercase font-bold tracking-wider">Em Andamento</span>
            <div className="text-2xl font-black text-cyan-400 mt-1">{stats.inProgress}</div>
          </div>

          <div
            onClick={() => setStatusFilter('CONCLUIDO')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all ${
              statusFilter === 'CONCLUIDO'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                : 'bg-[#14171F] border-zinc-800 text-zinc-400 hover:border-zinc-700'
            }`}
          >
            <span className="text-[10px] uppercase font-bold tracking-wider">Concluídas</span>
            <div className="text-2xl font-black text-emerald-400 mt-1">{stats.completed}</div>
          </div>
        </div>

        {/* Plans List */}
        {loading ? (
          <div className="p-12 text-center text-zinc-500 text-xs">Carregando plano de ação...</div>
        ) : plans.length === 0 ? (
          <div className="p-12 rounded-3xl bg-[#14171F] border border-zinc-800 text-center space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
              <CheckSquare className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-white">Nenhuma ação neste filtro</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Execute o Diagnóstico da Barbearia para gerar automaticamente tarefas personalizadas ou clique em &quot;Nova Ação&quot;.
            </p>
            <div className="flex justify-center gap-3">
              <Link
                href="/academia/diagnostico"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-md shadow-amber-500/20"
              >
                Fazer Diagnóstico Agora
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map((plan) => {
              return (
                <div
                  key={plan.id}
                  className={`rounded-3xl bg-[#14171F] border p-6 space-y-5 transition-all ${
                    plan.status === 'CONCLUIDO'
                      ? 'border-emerald-500/20 bg-emerald-950/5 opacity-80'
                      : plan.status === 'EM_ANDAMENTO'
                      ? 'border-cyan-500/30'
                      : 'border-zinc-800'
                  }`}
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[9px] uppercase font-extrabold px-2.5 py-0.5 rounded-full border ${
                            plan.status === 'CONCLUIDO'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : plan.status === 'EM_ANDAMENTO'
                              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {plan.status === 'CONCLUIDO'
                            ? 'CONCLUÍDO'
                            : plan.status === 'EM_ANDAMENTO'
                            ? 'EM ANDAMENTO'
                            : 'PENDENTE'}
                        </span>
                        <span className="text-xs text-zinc-400 font-medium">
                          Prazo estimado: <strong className="text-white">{plan.deadlineDays} dias</strong>
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white">{plan.title}</h3>
                    </div>

                    {/* Action Status Controls */}
                    <div className="flex items-center gap-2">
                      {plan.status === 'PENDENTE' && (
                        <button
                          onClick={() => updateStatus(plan.id, 'EM_ANDAMENTO')}
                          className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center gap-1.5 transition-all border border-cyan-500/20"
                        >
                          <PlayCircle className="h-3.5 w-3.5" />
                          <span>Iniciar</span>
                        </button>
                      )}

                      {plan.status !== 'CONCLUIDO' && (
                        <button
                          onClick={() => updateStatus(plan.id, 'CONCLUIDO')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Concluir</span>
                        </button>
                      )}

                      {plan.status === 'CONCLUIDO' && (
                        <button
                          onClick={() => updateStatus(plan.id, 'PENDENTE')}
                          className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-zinc-700/60"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Reabrir</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Body Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">
                          ⚠️ Problema Identificado
                        </span>
                        <p className="text-zinc-300 leading-relaxed bg-[#181B22] p-3 rounded-xl border border-zinc-800/80">
                          {plan.problem}
                        </p>
                      </div>

                      {plan.whyItMatters && (
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">
                            💡 Por Que Isso Importa
                          </span>
                          <p className="text-zinc-400 leading-relaxed bg-[#181B22] p-3 rounded-xl border border-zinc-800/80">
                            {plan.whyItMatters}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 block mb-1">
                          ⚡ Ação Recomendada
                        </span>
                        <p className="text-white font-medium leading-relaxed bg-amber-500/5 p-3 rounded-xl border border-amber-500/20">
                          {plan.action}
                        </p>
                      </div>

                      {plan.howTo && (
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">
                            🛠️ Como Fazer Passo a Passo
                          </span>
                          <p className="text-zinc-300 leading-relaxed whitespace-pre-line bg-[#181B22] p-3 rounded-xl border border-zinc-800/80">
                            {plan.howTo}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Target Indicator */}
                  {plan.indicator && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                        <BarChart3 className="h-4 w-4 shrink-0" />
                        <span>Indicador de Sucesso: {plan.indicator}</span>
                      </div>
                    </div>
                  )}

                  {/* Recommendations Section (Aprenda, Ferramentas, Checklists) */}
                  {(plan.resolvedContents?.length || plan.resolvedTool || plan.resolvedChecklist) && (
                    <div className="pt-3 border-t border-zinc-800/80 space-y-3">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">
                        Recursos Recomendados da Academia BarberFlow
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* 📚 Aprenda Content */}
                        {plan.resolvedContents && plan.resolvedContents.length > 0 && (
                          <div className="p-3 rounded-xl bg-[#181B22] border border-zinc-800 space-y-1.5 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-1">
                                <BookOpen className="h-3.5 w-3.5" />
                                <span>📚 Aprenda</span>
                              </div>
                              <p className="text-xs font-semibold text-white line-clamp-1">
                                {plan.resolvedContents[0].title}
                              </p>
                              <span className="text-[10px] text-zinc-400">
                                {plan.resolvedContents[0].institution} • {plan.resolvedContents[0].duration}
                              </span>
                            </div>
                            <a
                              href={plan.resolvedContents[0].officialUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                            >
                              <span>Acessar Conteúdo</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}

                        {/* 🧮 Ferramenta / Calculadora */}
                        {plan.resolvedTool && (
                          <div className="p-3 rounded-xl bg-[#181B22] border border-zinc-800 space-y-1.5 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mb-1">
                                <Wrench className="h-3.5 w-3.5" />
                                <span>🧮 Ferramenta</span>
                              </div>
                              <p className="text-xs font-semibold text-white line-clamp-1">
                                {plan.resolvedTool.name}
                              </p>
                              <span className="text-[10px] text-zinc-400">Calculadora Interativa</span>
                            </div>
                            <Link
                              href="/academia/ferramentas"
                              className="mt-2 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                            >
                              <span>Abrir Calculadora</span>
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          </div>
                        )}

                        {/* ☑️ Checklist */}
                        {plan.resolvedChecklist && (
                          <div className="p-3 rounded-xl bg-[#181B22] border border-zinc-800 space-y-1.5 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 mb-1">
                                <CheckSquare className="h-3.5 w-3.5" />
                                <span>☑️ Checklist</span>
                              </div>
                              <p className="text-xs font-semibold text-white line-clamp-1">
                                {plan.resolvedChecklist.name}
                              </p>
                              <span className="text-[10px] text-zinc-400">
                                Rotina {plan.resolvedChecklist.frequency}
                              </span>
                            </div>
                            <Link
                              href="/academia/ferramentas"
                              className="mt-2 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                            >
                              <span>Ver Checklist</span>
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Nova Ação Personalizada */}
      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Ação Estratégica">
          <form onSubmit={handleCreateCustom} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Título da Ação *</label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: Criar Combo de Terça e Quarta"
                className="w-full bg-[#181B22] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Problema Identificado *</label>
              <textarea
                required
                rows={2}
                value={newProblem}
                onChange={(e) => setNewProblem(e.target.value)}
                placeholder="Ex: Terças e quartas com ocupação abaixo de 40% gerando ociosidade."
                className="w-full bg-[#181B22] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Por Que Isso Importa</label>
              <textarea
                rows={2}
                value={newWhyItMatters}
                onChange={(e) => setNewWhyItMatters(e.target.value)}
                placeholder="Ex: O custo de aluguel e energia é pago mesmo com as cadeiras vazias."
                className="w-full bg-[#181B22] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-amber-400 mb-1">Ação a Ser Executada *</label>
              <input
                type="text"
                required
                value={newAction}
                onChange={(e) => setNewAction(e.target.value)}
                placeholder="Ex: Cadastrar serviço Combo Master e enviar WhatsApp para a base."
                className="w-full bg-[#181B22] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-300 mb-1">Como Fazer (Passo a Passo)</label>
              <textarea
                rows={3}
                value={newHowTo}
                onChange={(e) => setNewHowTo(e.target.value)}
                placeholder="1) Cadastrar serviço no BarberFlow&#10;2) Disparar mensagens na segunda-feira&#10;3) Alinhar com barbeiros"
                className="w-full bg-[#181B22] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Prazo (Dias)</label>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={newDeadlineDays}
                  onChange={(e) => setNewDeadlineDays(Number(e.target.value) || 7)}
                  className="w-full bg-[#181B22] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block font-semibold text-zinc-300 mb-1">Indicador de Sucesso</label>
                <input
                  type="text"
                  value={newIndicator}
                  onChange={(e) => setNewIndicator(e.target.value)}
                  placeholder="Ex: +15 agendamentos"
                  className="w-full bg-[#181B22] border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold disabled:opacity-50"
              >
                {creating ? 'Salvando...' : 'Salvar Ação'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </AppShell>
  );
}
