'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { Modal } from '@/components/UI/Modal';
import { Badge } from '@/components/UI/Badge';
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
} from 'lucide-react';
import { EducationContentItem } from '@/lib/academia/content';

export default function AcademiaPage() {
  const [contents, setContents] = useState<EducationContentItem[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

      const res = await fetch(`/api/academia/contents?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setContents(data.contents || []);
        setCategories(data.categories || []);
        setStats(data.stats || null);
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
      prev.map((c) => (c.id === item.id ? { ...c, isCompleted: newStatus } as any : c))
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
      // Refresh stats in background
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
      prev.map((c) => (c.id === item.id ? { ...c, isFavorite: newStatus } as any : c))
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

  return (
    <AppShell
      title="🎓 Academia BarberFlow"
      subtitle="Educação, Conteúdo Estratégico, Ferramentas de Gestão e Consultor IA para sua Barbearia"
    >
      <div className="space-y-6">
        {/* Top Quick Action Banners */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Comece Aqui Card / Progress */}
          <div className="md:col-span-1 rounded-2xl bg-gradient-to-br from-amber-500/20 via-zinc-900 to-zinc-950 border border-amber-500/30 p-5 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-400">
                  <Compass className="h-4 w-4" /> Trilha Inicial
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                  {stats?.comeceAquiPercent || 0}% Concluído
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Primeiros Passos da Barbearia</h3>
              <p className="text-xs text-zinc-300 leading-relaxed mb-4">
                10 módulos rápidos com os fundamentos essenciais de faturamento, precificação, equipe e retenção.
              </p>
            </div>

            <div>
              <div className="w-full bg-zinc-800 rounded-full h-2.5 mb-3 overflow-hidden">
                <div
                  className="bg-amber-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${stats?.comeceAquiPercent || 0}%` }}
                />
              </div>
              <button
                onClick={() => setSelectedCategory('COMECE_AQUI')}
                className="w-full py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20"
              >
                <span>Acessar Trilha Comece Aqui</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Ferramentas Práticas Banner */}
          <Link
            href="/academia/ferramentas"
            className="group rounded-2xl bg-[#14171F] border border-zinc-800 hover:border-emerald-500/40 p-5 shadow-lg flex flex-col justify-between transition-all hover:bg-zinc-900/80"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Wrench className="h-4 w-4" />
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  12 Calculadoras + 8 Geradores
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition-colors mb-1">
                🛠️ Ferramentas & Calculadoras
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Calculadora de preço de venda, ponto de equilíbrio, geradores de posts no Instagram, mensagens de WhatsApp e 9 checklists operacionais.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-emerald-400 gap-1 group-hover:translate-x-1 transition-transform">
              <span>Abrir Central de Ferramentas</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>

          {/* Assistente IA Consultivo */}
          <Link
            href="/academia/ia"
            className="group rounded-2xl bg-[#14171F] border border-zinc-800 hover:border-amber-500/40 p-5 shadow-lg flex flex-col justify-between transition-all hover:bg-zinc-900/80"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Consultor Especialista
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors mb-1">
                🤖 Consultor BarberFlow
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Diagnósticos fundamentados, planos de ação para lotar horários vazios, elevar ticket médio e analisar os números da sua barbearia.
              </p>
            </div>
            <div className="mt-4 flex items-center text-xs font-semibold text-amber-400 gap-1 group-hover:translate-x-1 transition-transform">
              <span>Fazer Consulta com o Consultor</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
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
              Exibindo <strong className="text-white">{contents.length}</strong> conteúdos encontrados
            </span>
            {stats && (
              <span className="text-xs text-zinc-400">
                Você concluiu <strong className="text-amber-400">{stats.completedCount}</strong> de {stats.totalContents} itens ({stats.progressPercent}%)
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
                const isCourse = item.format === 'CURSO';
                const isVideo = item.format === 'VIDEO';

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
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 border-t border-zinc-800/80 pt-3 mb-3">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-zinc-400" />
                          {item.duration}
                        </span>
                        <span className="capitalize font-medium text-zinc-400">
                          {item.level.toLowerCase()}
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
                            rel="noreferrer"
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
              <span className="text-zinc-400">Verificado em: {readingItem.lastVerifiedAt}</span>
            </div>

            <div className="prose prose-invert prose-xs sm:prose-sm max-w-none text-zinc-300 leading-relaxed whitespace-pre-line font-normal">
              {readingItem.contentBody || readingItem.description}
            </div>

            <div className="border-t border-zinc-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <a
                href={readingItem.officialUrl}
                target="_blank"
                rel="noreferrer"
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
