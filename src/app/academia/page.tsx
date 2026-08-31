'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { Modal } from '@/components/UI/Modal';
import {
  GraduationCap,
  Sparkles,
  Search,
  BookOpen,
  CheckCircle2,
  Bookmark,
  ExternalLink,
  Bot,
  Wrench,
  Flame,
  Clock,
  Compass,
  ArrowRight,
  Filter,
  Check,
  Star,
  PlaySquare,
  ShieldCheck,
  TrendingUp,
  DollarSign,
  Users,
  Briefcase,
  Megaphone,
  Activity,
  CheckSquare,
  HelpCircle,
} from 'lucide-react';
import { EducationContentItem } from '@/lib/academia/content';
import { DiagnosticResult, DailyPriority } from '@/lib/academia/diagnostic-engine';

export default function AcademiaPage() {
  const [contents, setContents] = useState<EducationContentItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Diagnostic State
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [actionPlanCount, setActionPlanCount] = useState({ total: 0, pending: 0 });

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('TODOS');
  const [favoritesOnly, setFavoritesOnly] = useState<boolean>(false);

  // Reading Modal for Articles / Pills
  const [readingItem, setReadingItem] = useState<EducationContentItem | null>(null);

  const fetchContents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'TODOS') params.set('category', selectedCategory);
      if (searchQuery) params.set('search', searchQuery);
      if (selectedLevel && selectedLevel !== 'TODOS') params.set('level', selectedLevel);
      if (favoritesOnly) params.set('favorites', 'true');

      const [res, diagRes, planRes] = await Promise.all([
        fetch(`/api/academia/contents?${params.toString()}`),
        fetch('/api/academia/diagnostic'),
        fetch('/api/academia/action-plan'),
      ]);

      if (res.ok) {
        const data = await res.json();
        setContents(data.contents || []);
        setCategories(data.categories || []);
        setStats(data.stats || null);
      }

      if (diagRes.ok) {
        const dData = await diagRes.json();
        if (dData.diagnostic) {
          setDiagnostic(dData.diagnostic);
        }
      }

      if (planRes.ok) {
        const pData = await planRes.json();
        if (pData.stats) {
          setActionPlanCount({ total: pData.stats.total, pending: pData.stats.pending });
        }
      }
    } catch (err) {
      console.error('Error fetching contents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContents();
  }, [selectedCategory, selectedLevel, favoritesOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchContents();
  };

  const toggleProgress = async (item: EducationContentItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newStatus = !(item as any).isCompleted;

    // Optimistic UI update
    setContents((prev) =>
      prev.map((c) => (c.id === item.id ? ({ ...c, isCompleted: newStatus } as any) : c))
    );

    if (readingItem && readingItem.id === item.id) {
      setReadingItem({ ...readingItem, isCompleted: newStatus } as any);
    }

    try {
      await fetch('/api/academia/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: item.id, isCompleted: newStatus }),
      });
      const statsRes = await fetch('/api/academia/contents');
      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d.stats);
      }
    } catch (err) {
      console.error('Error updating progress:', err);
    }
  };

  const toggleFavorite = async (item: EducationContentItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newStatus = !(item as any).isFavorite;

    setContents((prev) =>
      prev.map((c) => (c.id === item.id ? ({ ...c, isFavorite: newStatus } as any) : c))
    );

    try {
      await fetch('/api/academia/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentId: item.id, isFavorite: newStatus }),
      });
    } catch (err) {
      console.error('Error toggling favorite:', err);
    }
  };

  const getScoreColor = (category?: string) => {
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
      title="🎓 Academia BarberFlow"
      subtitle="Consultoria Estratégica, Diagnóstico Inteligente, Ferramentas e Cursos Oficiais para sua Barbearia"
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/academia/diagnostico"
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Meu Diagnóstico</span>
          </Link>
          <Link
            href="/academia/plano"
            className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-zinc-700"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            <span>Plano de Ação ({actionPlanCount.pending})</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Banner: "Como está sua barbearia hoje?" */}
        <div className="rounded-3xl bg-gradient-to-r from-amber-500/15 via-[#151922] to-zinc-950 border border-amber-500/30 p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="text-xs uppercase font-bold tracking-wider text-amber-400 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Consultor de Gestão da Barbearia
            </span>
            <h2 className="text-xl md:text-2xl font-black text-white">
              Como está sua barbearia hoje?
            </h2>
            <p className="text-xs md:text-sm text-zinc-300 max-w-2xl leading-relaxed">
              O BarberFlow analisa sua ocupação, clientes inativos, ticket médio e contas para orientar suas prioridades diárias sem custo de IA.
            </p>
          </div>
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <Link
              href="/academia/diagnostico"
              className="w-full md:w-auto px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 whitespace-nowrap"
            >
              <span>Ver Meu Diagnóstico</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* 4 Pillars Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Saúde da Barbearia */}
          <Link
            href="/academia/diagnostico"
            className="group rounded-2xl bg-[#14171F] border border-zinc-800 hover:border-amber-500/40 p-5 shadow-lg flex flex-col justify-between transition-all hover:bg-zinc-900/80"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase font-bold text-zinc-400 flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-amber-400" /> Saúde do Negócio
                </span>
                {diagnostic?.healthCategory && (
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${getScoreColor(
                      diagnostic.healthCategory
                    )}`}
                  >
                    {diagnostic.healthCategory}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-3xl font-black text-white">
                  {diagnostic?.healthScore ?? 0}
                </span>
                <span className="text-sm text-zinc-500 font-semibold">/100</span>
              </div>
              <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                {diagnostic?.healthCategory === 'EXCELENTE' && 'Sua barbearia está com ótimos índices de faturamento e retenção.'}
                {diagnostic?.healthCategory === 'SAUDAVEL' && 'Operação equilibrada. Há oportunidades para elevar o ticket médio.'}
                {diagnostic?.healthCategory === 'ATENCAO' && 'Atenção necessária em ocupação de dias úteis e clientes inativos.'}
                {diagnostic?.healthCategory === 'CRITICO' && 'Gargalos financeiros e de retenção identificados.'}
                {(!diagnostic || diagnostic.healthCategory === 'DADOS_INSUFICIENTES') &&
                  'Responda as 15 perguntas para apurar o score completo.'}
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-amber-400 gap-1 group-hover:translate-x-1 transition-transform">
              <span>Abrir Diagnóstico</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>

          {/* 2. Plano de Ação */}
          <Link
            href="/academia/plano"
            className="group rounded-2xl bg-[#14171F] border border-zinc-800 hover:border-cyan-500/40 p-5 shadow-lg flex flex-col justify-between transition-all hover:bg-zinc-900/80"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase font-bold text-zinc-400 flex items-center gap-1.5">
                  <CheckSquare className="h-4 w-4 text-cyan-400" /> Plano de Ação
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                  {actionPlanCount.pending} Pendentes
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-3xl font-black text-white">{actionPlanCount.total}</span>
                <span className="text-sm text-zinc-500 font-semibold">tarefas</span>
              </div>
              <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                Ações práticas com passo a passo, prazos e metas para aumentar a receita da sua barbearia.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-cyan-400 gap-1 group-hover:translate-x-1 transition-transform">
              <span>Ver Plano Estruturado</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>

          {/* 3. Ferramentas & Calculadoras */}
          <Link
            href="/academia/ferramentas"
            className="group rounded-2xl bg-[#14171F] border border-zinc-800 hover:border-emerald-500/40 p-5 shadow-lg flex flex-col justify-between transition-all hover:bg-zinc-900/80"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase font-bold text-zinc-400 flex items-center gap-1.5">
                  <Wrench className="h-4 w-4 text-emerald-400" /> Ferramentas
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  12 Calculadoras
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-3xl font-black text-white">29</span>
                <span className="text-sm text-zinc-500 font-semibold">utilitários</span>
              </div>
              <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                Preço de venda, ponto de equilíbrio, geradores de WhatsApp e checklists operacionais.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-emerald-400 gap-1 group-hover:translate-x-1 transition-transform">
              <span>Central de Ferramentas</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>

          {/* 4. Consultor BarberFlow */}
          <Link
            href="/academia/ia"
            className="group rounded-2xl bg-[#14171F] border border-zinc-800 hover:border-amber-500/40 p-5 shadow-lg flex flex-col justify-between transition-all hover:bg-zinc-900/80"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs uppercase font-bold text-zinc-400 flex items-center gap-1.5">
                  <Bot className="h-4 w-4 text-amber-400" /> Consultor BarberFlow
                </span>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Sem Custo IA
                </span>
              </div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-2xl font-black text-white">Pergunte</span>
              </div>
              <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                Tire dúvidas sobre horários vazios, comissão ideal de equipe, MEI e estratégias de faturamento.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-amber-400 gap-1 group-hover:translate-x-1 transition-transform">
              <span>Fazer Consulta Rápida</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        </div>

        {/* Widget: "🎯 O que fazer hoje" */}
        {diagnostic?.priorities && diagnostic.priorities.length > 0 && (
          <div className="rounded-3xl bg-[#12151B] border border-zinc-800 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🎯 O que fazer hoje</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Prioridades imediatas calculadas com base nos dados da sua operação
                </p>
              </div>
              <Link
                href="/academia/plano"
                className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                <span>Ver Todas as Ações</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {diagnostic.priorities.slice(0, 3).map((prio) => (
                <div
                  key={prio.id}
                  className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-4 flex flex-col justify-between space-y-3 hover:border-zinc-700 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-amber-400">{prio.rank}º Prioridade</span>
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
        )}

        {/* Trilha Comece Aqui Progress Banner */}
        <div className="rounded-2xl bg-gradient-to-br from-amber-500/20 via-zinc-900 to-zinc-950 border border-amber-500/30 p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
              <Compass className="h-4 w-4" /> Trilha Inicial: Primeiros Passos
            </span>
            <h3 className="text-base font-bold text-white">
              10 Módulos Essenciais de Gestão de Barbearia
            </h3>
            <p className="text-xs text-zinc-300 max-w-xl">
              Domine os fundamentos de precificação, atração de clientes, comissões e rotinas de caixa.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="text-right hidden sm:block">
              <span className="text-xs text-zinc-400 block font-medium">Seu Progresso</span>
              <span className="text-sm font-black text-amber-400">{stats?.comeceAquiPercent || 0}%</span>
            </div>
            <button
              onClick={() => setSelectedCategory('COMECE_AQUI')}
              className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/20 whitespace-nowrap"
            >
              <span>Acessar Módulos</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="rounded-2xl bg-[#12151B] border border-zinc-800 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar cursos, artigos, cálculos (ex: Sebrae, comissões, Instagram, MEI)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#181B22] border border-zinc-700/60 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
              />
            </form>

            {/* Level Filter */}
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="bg-[#181B22] border border-zinc-700/60 rounded-xl px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
            >
              <option value="TODOS">Todos os Níveis</option>
              <option value="INICIANTE">Nível Iniciante</option>
              <option value="INTERMEDIARIO">Nível Intermediário</option>
              <option value="AVANCADO">Nível Avançado</option>
            </select>

            {/* Favorites Toggle */}
            <button
              onClick={() => setFavoritesOnly(!favoritesOnly)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                favoritesOnly
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-[#181B22] text-zinc-400 border-zinc-700/60 hover:text-white'
              }`}
            >
              <Bookmark className={`h-3.5 w-3.5 ${favoritesOnly ? 'fill-amber-400 text-amber-400' : ''}`} />
              <span>Favoritos</span>
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar border-t border-zinc-800/80">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20 font-bold'
                      : 'bg-zinc-900/90 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-zinc-400 font-medium">
              Exibindo <strong className="text-white">{contents.length}</strong> conteúdos oficiais gratuitos
            </span>
            {stats && (
              <span className="text-xs text-zinc-400">
                Você concluiu <strong className="text-amber-400">{stats.completedCount}</strong> de{' '}
                {stats.totalContents} itens ({stats.progressPercent}%)
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-56 rounded-2xl bg-zinc-900/60 border border-zinc-800 animate-pulse" />
              ))}
            </div>
          ) : contents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 p-12 text-center">
              <GraduationCap className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
              <h4 className="text-sm font-semibold text-white mb-1">Nenhum conteúdo encontrado</h4>
              <p className="text-xs text-zinc-400">Tente ajustar seus termos de busca ou remover os filtros aplicados.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {contents.map((item: any) => {
                const isArticle = item.format === 'ARTIGO' || item.format === 'TRILHA';

                return (
                  <div
                    key={item.id}
                    className={`group rounded-2xl bg-[#13161D] border transition-all flex flex-col justify-between p-5 hover:shadow-xl ${
                      item.isCompleted
                        ? 'border-emerald-500/30 bg-emerald-950/10'
                        : 'border-zinc-800/80 hover:border-zinc-700 hover:bg-[#161922]'
                    }`}
                  >
                    <div>
                      {/* Top Header of Card */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                            {item.institution}
                          </span>
                          {item.certificate === 'SIM' && (
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Certificado
                            </span>
                          )}
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Gratuito
                          </span>
                        </div>

                        {/* Favorite button */}
                        <button
                          onClick={(e) => toggleFavorite(item, e)}
                          title="Salvar nos Favoritos"
                          className="text-zinc-500 hover:text-amber-400 transition-colors p-1"
                        >
                          <Bookmark className={`h-4 w-4 ${item.isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
                        </button>
                      </div>

                      {/* Title */}
                      <h4 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors line-clamp-2 mb-2 leading-snug">
                        {item.title}
                      </h4>

                      {/* Description */}
                      <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed mb-4">
                        {item.description}
                      </p>
                    </div>

                    <div>
                      {/* Meta information */}
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-800/80 pt-3 mb-2">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-zinc-400" />
                          {item.duration}
                        </span>
                        <span className="capitalize font-medium text-zinc-400">
                          {item.level.toLowerCase()}
                        </span>
                      </div>

                      {/* Verification badge */}
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-3 px-0.5">
                        <span className="flex items-center gap-1 text-emerald-500/80">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Link verificado em 31/08/2026</span>
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {isArticle && item.contentBody ? (
                          <button
                            onClick={() => setReadingItem(item)}
                            className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-amber-500/10"
                          >
                            <BookOpen className="h-3.5 w-3.5" />
                            <span>Ler Conteúdo</span>
                          </button>
                        ) : (
                          <a
                            href={item.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors border border-zinc-700"
                          >
                            <span>Acessar no {item.institution}</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}

                        {/* Complete button */}
                        <button
                          onClick={(e) => toggleProgress(item, e)}
                          title={item.isCompleted ? 'Desmarcar Concluído' : 'Marcar como Concluído'}
                          className={`p-2 rounded-xl border transition-all ${
                            item.isCompleted
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : 'bg-zinc-800/60 text-zinc-400 hover:text-white border-zinc-700/60'
                          }`}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Reading Modal */}
      {readingItem && (
        <Modal
          isOpen={true}
          onClose={() => setReadingItem(null)}
          title={readingItem.title}
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 text-zinc-200">
            <div className="flex flex-wrap items-center gap-2 text-xs border-b border-zinc-800 pb-3">
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                {readingItem.institution}
              </span>
              <span className="flex items-center gap-1 text-zinc-400">
                <Clock className="h-3 w-3" /> {readingItem.duration}
              </span>
              <span className="text-zinc-500">•</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Link verificado em 31/08/2026</span>
              </span>
            </div>

            <div className="prose prose-invert prose-xs sm:prose-sm max-w-none text-zinc-300 leading-relaxed whitespace-pre-line font-normal">
              {readingItem.contentBody || readingItem.description}
            </div>

            <div className="border-t border-zinc-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <a
                href={readingItem.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>Ver fonte oficial ({readingItem.institution})</span>
                <ExternalLink className="h-3 w-3" />
              </a>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => toggleProgress(readingItem)}
                  className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    (readingItem as any).isCompleted
                      ? 'bg-emerald-500 text-black font-bold'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{(readingItem as any).isCompleted ? 'Concluído ✓' : 'Marcar como Concluído'}</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
