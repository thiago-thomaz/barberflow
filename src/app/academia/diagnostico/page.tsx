'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Users,
  Briefcase,
  Activity,
  Zap,
  BarChart3,
  Flame,
  Clock,
  ShieldCheck,
  RotateCcw,
  Check,
  HelpCircle,
} from 'lucide-react';
import {
  DIAGNOSTIC_QUESTIONS,
  DiagnosticAnswers,
  DiagnosticResult,
  TenantRealMetrics,
} from '@/lib/academia/diagnostic-engine';

export default function AcademiaDiagnosticoPage() {
  const [answers, setAnswers] = useState<DiagnosticAnswers>({
    q1_barbersCount: 1,
    q2_monthlyRevenue: 0,
    q3_monthlyAppointments: 0,
    q4_avgTicket: 0,
    q5_activeClients: 0,
    q6_inactiveClients: 0,
    q7_trackPayables: false,
    q8_trackReceivables: false,
    q9_knowsMonthlyCost: false,
    q10_knowsBreakEven: false,
    q11_doesReactivationCampaigns: false,
    q12_tracksOccupancyRate: false,
    q13_hasMonthlyGoal: false,
    q14_tracksNetProfit: false,
    q15_biggestProblem: 'Aumentar faturamento',
  });

  const [realMetrics, setRealMetrics] = useState<TenantRealMetrics | null>(null);
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeStep, setActiveStep] = useState<'FORM' | 'RESULT'>('FORM');

  useEffect(() => {
    async function loadInitial() {
      try {
        setLoading(true);
        const res = await fetch('/api/academia/diagnostic');
        if (res.ok) {
          const data = await res.json();
          if (data.realMetrics) {
            setRealMetrics(data.realMetrics);
          }
          if (data.diagnostic) {
            setDiagnosticResult(data.diagnostic);
            if (data.latestRecord) {
              setActiveStep('RESULT');
            }
          }
        }
      } catch (err) {
        console.error('Error loading diagnostic:', err);
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, []);

  const handleFillRealData = () => {
    if (!realMetrics) return;
    setAnswers((prev) => ({
      ...prev,
      q1_barbersCount: realMetrics.barbersCount || prev.q1_barbersCount || 1,
      q2_monthlyRevenue: realMetrics.monthlyRevenue || prev.q2_monthlyRevenue || 0,
      q3_monthlyAppointments: realMetrics.monthlyAppointments || prev.q3_monthlyAppointments || 0,
      q4_avgTicket: realMetrics.avgTicket || prev.q4_avgTicket || 0,
      q5_activeClients: realMetrics.activeClientsCount || prev.q5_activeClients || 0,
      q6_inactiveClients: realMetrics.inactiveClientsCount || prev.q6_inactiveClients || 0,
      q7_trackPayables: realMetrics.hasAccountsPayable ?? prev.q7_trackPayables,
      q8_trackReceivables: realMetrics.hasAccountsReceivable ?? prev.q8_trackReceivables,
      q9_knowsMonthlyCost: realMetrics.hasRecurringExpenses ?? prev.q9_knowsMonthlyCost,
      q12_tracksOccupancyRate: realMetrics.occupancyRate > 0 ? true : prev.q12_tracksOccupancyRate,
      q13_hasMonthlyGoal: realMetrics.hasGoalsConfigured ?? prev.q13_hasMonthlyGoal,
    }));
  };

  const handleCalculateAndSave = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/academia/diagnostic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });

      if (res.ok) {
        const data = await res.json();
        setDiagnosticResult(data.diagnostic);
        setActiveStep('RESULT');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Error saving diagnostic:', err);
    } finally {
      setSaving(false);
    }
  };

  const getScoreColor = (category: string) => {
    switch (category) {
      case 'EXCELENTE':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'SAUDAVEL':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'ATENCAO':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'CRITICO':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      default:
        return 'text-zinc-400 bg-zinc-800 border-zinc-700';
    }
  };

  return (
    <AppShell
      title="🩺 Diagnóstico da sua Barbearia"
      subtitle="Responda algumas perguntas e descubra onde sua operação pode melhorar"
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
            href="/academia/plano"
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
          >
            <span>Ver Plano de Ação</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Toggle Mode Navigation */}
        <div className="flex items-center justify-between bg-[#12151B] p-2 rounded-2xl border border-zinc-800">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveStep('FORM')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeStep === 'FORM'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              1. Questionário (15 Perguntas)
            </button>
            <button
              onClick={() => setActiveStep('RESULT')}
              disabled={!diagnosticResult}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeStep === 'RESULT'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed'
              }`}
            >
              2. Resultado & Score de Saúde
            </button>
          </div>

          {realMetrics && activeStep === 'FORM' && (
            <button
              onClick={handleFillRealData}
              className="text-xs px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-semibold flex items-center gap-1.5 transition-all"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Puxar Dados Reais do BarberFlow</span>
            </button>
          )}
        </div>

        {/* STEP 1: FORM */}
        {activeStep === 'FORM' && (
          <div className="space-y-6">
            {/* Header Banner */}
            <div className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-950 border border-amber-500/20 p-5">
              <h2 className="text-lg font-bold text-white mb-1">
                Diagnóstico de Gestão, Finanças e Retenção
              </h2>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-3xl">
                O motor do BarberFlow analisa seus dados reais ou respostas para calcular seu{' '}
                <strong className="text-amber-400">Índice de Saúde (0 a 100)</strong>, identificar gargalos ocultos de lucro e gerar um plano de ação prático com zero custo de IA.
              </p>
            </div>

            {/* Questions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DIAGNOSTIC_QUESTIONS.map((q) => {
                const answerVal = (answers as any)[q.id];

                return (
                  <div
                    key={q.id}
                    className="rounded-2xl bg-[#14171F] border border-zinc-800/90 p-4 space-y-3 flex flex-col justify-between hover:border-zinc-700 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">
                          Pergunta {q.order} de 15 • {q.category}
                        </span>
                        {q.realDataKey && realMetrics && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-medium">
                            Real: {String(realMetrics[q.realDataKey] ?? '—')}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-white mb-1">{q.title}</h3>
                      {q.helpText && <p className="text-xs text-zinc-400">{q.helpText}</p>}
                    </div>

                    <div className="pt-2 border-t border-zinc-800/60">
                      {q.type === 'number' && (
                        <input
                          type="number"
                          min="0"
                          value={answerVal ?? ''}
                          onChange={(e) =>
                            setAnswers({ ...answers, [q.id]: Number(e.target.value) || 0 })
                          }
                          placeholder={q.placeholder}
                          className="w-full bg-[#181B22] border border-zinc-700/80 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                        />
                      )}

                      {q.type === 'currency' && (
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">
                            R$
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={answerVal ?? ''}
                            onChange={(e) =>
                              setAnswers({ ...answers, [q.id]: Number(e.target.value) || 0 })
                            }
                            placeholder={q.placeholder}
                            className="w-full bg-[#181B22] border border-zinc-700/80 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      )}

                      {q.type === 'boolean' && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setAnswers({ ...answers, [q.id]: true })}
                            className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                              answerVal === true
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                                : 'bg-[#181B22] text-zinc-400 border-zinc-700/60 hover:text-white'
                            }`}
                          >
                            Sim
                          </button>
                          <button
                            type="button"
                            onClick={() => setAnswers({ ...answers, [q.id]: false })}
                            className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                              answerVal === false
                                ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-sm'
                                : 'bg-[#181B22] text-zinc-400 border-zinc-700/60 hover:text-white'
                            }`}
                          >
                            Não
                          </button>
                        </div>
                      )}

                      {q.type === 'select' && q.options && (
                        <select
                          value={answerVal ?? q.options[0]}
                          onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                          className="w-full bg-[#181B22] border border-zinc-700/80 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                        >
                          {q.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Action */}
            <div className="flex justify-end pt-4">
              <button
                onClick={handleCalculateAndSave}
                disabled={saving}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                {saving ? (
                  <span>Calculando Diagnóstico...</span>
                ) : (
                  <>
                    <span>Gerar Diagnóstico & Plano de Ação</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: RESULT VIEW */}
        {activeStep === 'RESULT' && diagnosticResult && (
          <div className="space-y-6">
            {/* Top Score Banner */}
            <div className="rounded-3xl bg-gradient-to-br from-[#151922] via-[#12151B] to-black border border-zinc-800 p-6 md:p-8 shadow-2xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <span className="text-xs uppercase font-bold tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Activity className="h-4 w-4" /> Índice de Saúde da Barbearia
                  </span>
                  <h2 className="text-2xl md:text-3xl font-black text-white">
                    {diagnosticResult.healthCategory === 'EXCELENTE' && 'Operação em Nível Excelente 🚀'}
                    {diagnosticResult.healthCategory === 'SAUDAVEL' && 'Operação Saudável & Equilibrada 💈'}
                    {diagnosticResult.healthCategory === 'ATENCAO' && 'Atenção a Gargalos de Ocupação & Margem ⚠️'}
                    {diagnosticResult.healthCategory === 'CRITICO' && 'Alerta Crítico: Ação Imediata Necessária 🚨'}
                    {diagnosticResult.healthCategory === 'DADOS_INSUFICIENTES' && 'Dados Insuficientes para Análise 📋'}
                  </h2>
                  <p className="text-xs md:text-sm text-zinc-300 max-w-2xl leading-relaxed">
                    Maior foco estratégico apontado:{' '}
                    <strong className="text-white">{diagnosticResult.biggestProblemIdentified}</strong>.
                    Seu score consolida 6 pilares de ocupação, retenção, ticket médio, gestão financeira, fluxo e metas.
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 min-w-[180px]">
                  <span className="text-5xl font-black tracking-tight text-white mb-1">
                    {diagnosticResult.healthScore}
                    <span className="text-lg text-zinc-500 font-normal">/100</span>
                  </span>
                  <span
                    className={`text-xs uppercase font-extrabold px-3 py-1 rounded-full border ${getScoreColor(
                      diagnosticResult.healthCategory
                    )}`}
                  >
                    {diagnosticResult.healthCategory}
                  </span>
                </div>
              </div>
            </div>

            {/* Missing Data Warning if applicable */}
            {diagnosticResult.missingData?.isInsufficient && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-white mb-1">Atenção: Dados Faltantes</h4>
                  <p className="leading-relaxed mb-2">{diagnosticResult.missingData.guidance}</p>
                  <span className="font-semibold">Campos sugeridos para preencher: </span>
                  {diagnosticResult.missingData.missingFields.join(', ')}.
                </div>
              </div>
            )}

            {/* 6 Pillars Breakdown Grid */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-amber-400" /> Avaliação dos 6 Pilares de Gestão
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(diagnosticResult.pillars || {}).map(([key, pillar]) => (
                  <div
                    key={key}
                    className="rounded-2xl bg-[#14171F] border border-zinc-800 p-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white">{pillar.name}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getScoreColor(
                            pillar.status === 'BOM' ? 'SAUDAVEL' : pillar.status
                          )}`}
                        >
                          {pillar.score}/{pillar.maxScore} pts
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed mb-3">{pillar.diagnosis}</p>
                    </div>

                    <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full ${
                          pillar.status === 'EXCELENTE'
                            ? 'bg-emerald-500'
                            : pillar.status === 'BOM'
                            ? 'bg-cyan-500'
                            : pillar.status === 'ATENCAO'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                        style={{ width: `${(pillar.score / pillar.maxScore) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Painel "O que fazer hoje" (Top 3 Prioridades) */}
            <div className="rounded-3xl bg-[#12151B] border border-zinc-800 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>🎯 O que fazer hoje</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    As 3 ações de maior impacto imediato para aumentar seu faturamento e ocupação
                  </p>
                </div>
                <Link
                  href="/academia/plano"
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                  <span>Abrir Plano Completo</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {diagnosticResult.priorities.map((prio) => (
                  <div
                    key={prio.id}
                    className="rounded-2xl bg-zinc-900/90 border border-zinc-800/90 p-4 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-amber-400">
                          {prio.rank}º Prioridade
                        </span>
                        <span
                          className={`text-[9px] uppercase font-extrabold px-2 py-0.5 rounded border ${
                            prio.badge === 'URGENTE'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {prio.badge}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1">{prio.title}</h4>
                      <p className="text-xs text-zinc-400 leading-relaxed">{prio.description}</p>
                    </div>

                    <Link
                      href={prio.actionUrl}
                      className="w-full py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-zinc-700/60"
                    >
                      <span>{prio.actionLabel}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Plans Preview */}
            <div className="rounded-3xl bg-[#14171F] border border-zinc-800 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>📋 Plano de Ação Estruturado</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {diagnosticResult.actionPlans.length} tarefas estratégicas geradas automaticamente com base no seu diagnóstico
                  </p>
                </div>
                <Link
                  href="/academia/plano"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
                >
                  <span>Gerenciar Plano de Ação</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="space-y-3 pt-2">
                {diagnosticResult.actionPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="p-4 rounded-2xl bg-[#181B22] border border-zinc-800/80 space-y-2 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white">{plan.title}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-semibold">
                        Prazo: {plan.deadlineDays} dias
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      <strong className="text-zinc-300">Problema:</strong> {plan.problem}
                    </p>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      <strong className="text-amber-400">Ação:</strong> {plan.action}
                    </p>
                    <div className="text-[11px] text-emerald-400 font-semibold pt-1">
                      🎯 Indicador: {plan.indicator}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recalculate Button */}
            <div className="flex justify-start">
              <button
                onClick={() => setActiveStep('FORM')}
                className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-2 transition-colors border border-zinc-700/60"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Refazer Perguntas do Diagnóstico</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
