'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import {
  Bot,
  Sparkles,
  Send,
  ArrowLeft,
  Wrench,
  TrendingUp,
  Flame,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BarChart3,
  Calendar,
  History,
  RotateCcw,
} from 'lucide-react';
import { ConsultationResponse, TenantMetricsSnapshot } from '@/lib/academia/ai-consultant';

export default function AcademiaIaPage() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [includeMetrics, setIncludeMetrics] = useState(true);
  const [tenantMetrics, setTenantMetrics] = useState<TenantMetricsSnapshot | null>(null);
  const [currentConsultation, setCurrentConsultation] = useState<ConsultationResponse | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  // Suggested Quick Questions (Fase 9 / 16)
  const quickQuestions = [
    'Como aumentar meu faturamento?',
    'Estou cobrando pouco?',
    'Tenho clientes suficientes?',
    'Como reduzir horários vazios?',
    'Como melhorar minha recorrência?',
    'Minha situação financeira está saudável?',
    'Como aumentar meu ticket?',
  ];

  // Fetch tenant metrics summary and consultation history
  useEffect(() => {
    async function loadData() {
      try {
        const [metricsRes, historyRes] = await Promise.all([
          fetch('/api/academia/metrics-summary'),
          fetch('/api/academia/ia/history'),
        ]);

        if (metricsRes.ok) {
          const mData = await metricsRes.json();
          if (mData.metrics) setTenantMetrics(mData.metrics);
        }

        if (historyRes.ok) {
          const hData = await historyRes.json();
          if (hData.history) setHistory(hData.history);
        }
      } catch (err) {
        console.error('Error loading AI page data:', err);
      }
    }
    loadData();
  }, []);

  const handleAsk = async (textToAsk?: string) => {
    const query = textToAsk || question;
    if (!query.trim() || loading) return;

    setLoading(true);
    try {
      const res = await fetch('/api/academia/ia/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query.trim(),
          metrics: includeMetrics ? tenantMetrics : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentConsultation(data.consultation);
        setQuestion('');
        // Refresh history
        const hRes = await fetch('/api/academia/ia/history');
        if (hRes.ok) {
          const hData = await hRes.json();
          if (hData.history) setHistory(hData.history);
        }
      }
    } catch (err) {
      console.error('Error asking AI:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell
      title="🤖 Consultor BarberFlow"
      subtitle="Inteligência Consultiva Estratégica Especializada em Gestão, Lucratividade e Retenção"
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
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
          >
            <span>Meu Diagnóstico</span>
          </Link>
          <Link
            href="/academia/plano"
            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-zinc-700/60"
          >
            <span>Plano de Ação</span>
          </Link>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Form + Metrics Snapshot */}
        <div className="lg:col-span-5 space-y-5">
          {/* Main Question Box */}
          <div className="rounded-2xl bg-[#12151B] border border-zinc-800 p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Consultor de Negócios</h3>
                <span className="text-[11px] text-zinc-400">Especialista no nicho de barbearias brasileiras</span>
              </div>
            </div>

            {/* Input form */}
            <div className="space-y-3">
              <textarea
                rows={4}
                placeholder="Ex: Como posso aumentar meu faturamento mensal sem precisar contratar mais barbeiros?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleAsk();
                  }
                }}
                className="w-full bg-[#181B22] border border-zinc-700/60 rounded-xl p-3.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 resize-none leading-relaxed"
              />

              {/* Include metrics toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={includeMetrics}
                  onChange={(e) => setIncludeMetrics(e.target.checked)}
                  className="rounded border-zinc-700 text-amber-500 focus:ring-amber-500 bg-zinc-900"
                />
                <span>Incluir métricas reais da minha barbearia no diagnóstico</span>
              </label>

              <button
                onClick={() => handleAsk()}
                disabled={loading || !question.trim()}
                className={`w-full py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                  loading || !question.trim()
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20'
                }`}
              >
                {loading ? (
                  <>
                    <Sparkles className="h-4 w-4 animate-spin" />
                    <span>Analisando e estruturando plano...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Consultar Especialista</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Real Tenant Metrics Snapshot Card */}
          {tenantMetrics && (
            <div className="rounded-2xl bg-[#12151B] border border-zinc-800 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-zinc-800/80 pb-2">
                <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5 text-amber-400" /> Números do seu Negócio
                </span>
                <span className="text-[10px] text-zinc-500">Somente Leitura</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">Faturamento (30d)</span>
                  <span className="font-bold text-zinc-200">
                    R$ {tenantMetrics.monthlyRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">Ticket Médio</span>
                  <span className="font-bold text-zinc-200">
                    R$ {tenantMetrics.avgTicket?.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">Ocupação Estimada</span>
                  <span className="font-bold text-emerald-400">{tenantMetrics.occupancyRate}%</span>
                </div>
                <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block">Clientes em Risco</span>
                  <span className="font-bold text-amber-400">{tenantMetrics.inactiveClientsCount} clientes</span>
                </div>
              </div>
            </div>
          )}

          {/* Quick Questions list */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block px-1">
              Perguntas Frequentes & Rápidas
            </span>
            <div className="space-y-1.5">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuestion(q);
                    handleAsk(q);
                  }}
                  className="w-full text-left p-2.5 rounded-xl bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-800/80 transition-all hover:text-white flex items-center justify-between group"
                >
                  <span className="truncate mr-2">{q}</span>
                  <Sparkles className="h-3 w-3 text-zinc-500 group-hover:text-amber-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Structured Output or Welcome Banner */}
        <div className="lg:col-span-7 space-y-5">
          {currentConsultation ? (
            <div className="rounded-2xl bg-[#12151B] border border-amber-500/30 p-6 shadow-2xl space-y-5">
              {/* Header of the advice */}
              <div className="border-b border-zinc-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 inline-block mb-1">
                    {currentConsultation.topic}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    Parecer Consultivo Estratégico
                  </h3>
                </div>
                <span className="text-[10px] text-zinc-500">
                  Tempo de resposta: {currentConsultation.responseTimeMs}ms
                </span>
              </div>

              {/* 1. Problema */}
              <div className="rounded-xl bg-rose-950/20 border border-rose-500/30 p-4 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5" /> 1. Problema Identificado
                </span>
                <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-medium">
                  {currentConsultation.problem}
                </p>
              </div>

              {/* 2. Diagnóstico */}
              <div className="rounded-xl bg-zinc-950/80 border border-zinc-800 p-4 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" /> 2. Diagnóstico & Análise Técnica
                </span>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                  {currentConsultation.diagnosis}
                </p>
              </div>

              {/* 3. Recomendação */}
              <div className="rounded-xl bg-emerald-950/20 border border-emerald-500/30 p-4 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> 3. Recomendação Estratégica
                </span>
                <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-medium">
                  {currentConsultation.recommendation}
                </p>
              </div>

              {/* 4. Plano de Ação em 3 Passos */}
              <div className="space-y-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 block">
                  🎯 4. Plano de Ação Prático em 3 Passos:
                </span>
                <div className="space-y-2">
                  {currentConsultation.actionPlan.map((step) => (
                    <div
                      key={step.step}
                      className="p-3.5 rounded-xl bg-[#181B22] border border-zinc-800 flex items-start gap-3"
                    >
                      <div className="h-6 w-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                        {step.step}
                      </div>
                      <div>
                        <strong className="text-xs sm:text-sm text-white block mb-0.5 font-semibold">
                          {step.title}
                        </strong>
                        <p className="text-xs text-zinc-400 leading-relaxed">{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 5. Métrica de Acompanhamento */}
              <div className="rounded-xl bg-gradient-to-r from-amber-500/10 to-transparent border-l-4 border-amber-500 p-3.5 text-xs text-zinc-200">
                <strong className="text-amber-400 block mb-0.5 font-semibold">📊 5. Métrica de Sucesso:</strong>
                {currentConsultation.metric}
              </div>

              {/* Disclaimer se houver */}
              {currentConsultation.disclaimer && (
                <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800/80 text-[10px] text-zinc-400 leading-normal">
                  ⚠️ {currentConsultation.disclaimer}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-[#12151B] border border-zinc-800 p-8 text-center space-y-4">
              <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
                <Bot className="h-8 w-8" />
              </div>
              <div className="max-w-md mx-auto">
                <h4 className="text-base font-bold text-white mb-1">Como o Consultor BarberFlow funciona?</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Ele analisa as particularidades do mercado de barbearias, calcula impactos nos seus números e gera recomendações com planos de ação práticos (sem teorias complexas).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-left">
                <div className="bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
                  <span className="text-amber-400 font-bold text-xs block mb-1">1. Zero Custo de API</span>
                  <p className="text-[11px] text-zinc-400">Motor especializado incluído na sua assinatura do BarberFlow.</p>
                </div>
                <div className="bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
                  <span className="text-amber-400 font-bold text-xs block mb-1">2. Foco no Lucro Real</span>
                  <p className="text-[11px] text-zinc-400">Precificação, comissões, corte de custos e retenção de clientes.</p>
                </div>
                <div className="bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
                  <span className="text-amber-400 font-bold text-xs block mb-1">3. Ação em 3 Passos</span>
                  <p className="text-[11px] text-zinc-400">Respostas estruturadas para você executar no mesmo dia.</p>
                </div>
              </div>
            </div>
          )}

          {/* History of Consultations */}
          {history.length > 0 && (
            <div className="rounded-2xl bg-[#12151B] border border-zinc-800 p-5 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 border-b border-zinc-800 pb-2">
                <History className="h-4 w-4 text-zinc-400" />
                <span>Histórico de Consultas Recentes</span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setCurrentConsultation(item)}
                    className="p-3 rounded-xl bg-zinc-950/60 hover:bg-zinc-800/80 border border-zinc-800/80 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="overflow-hidden mr-2">
                      <span className="text-xs font-semibold text-zinc-200 block truncate group-hover:text-amber-400">
                        {item.question}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {new Date(item.createdAt).toLocaleDateString('pt-BR')} • {item.topic || 'Consultoria'}
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-400 font-medium shrink-0 group-hover:underline">
                      Rever Parecer →
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
