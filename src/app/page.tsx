import React from 'react';
import Link from 'next/link';
import {
  Scissors,
  Flame,
  Calendar,
  Zap,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  Sparkles,
  Smartphone,
  Star,
  Users,
  ChevronRight,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0C0F] text-zinc-100 flex flex-col selection:bg-amber-500 selection:text-black">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-[#0A0C0F]/90 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-black font-extrabold shadow-lg shadow-amber-500/20">
              <Scissors className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white block">BarberFlow</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400 block -mt-1">
                Agenda & Recorrência
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-zinc-300">
            <a href="#funcionalidades" className="hover:text-amber-400 transition-colors">
              Funcionalidades
            </a>
            <a href="#recorrencia" className="hover:text-amber-400 transition-colors">
              Motor de Recorrência
            </a>
            <a href="#automacao" className="hover:text-amber-400 transition-colors">
              Automação n8n
            </a>
            <a href="#planos" className="hover:text-amber-400 transition-colors">
              Planos
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-lg text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/onboarding"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-xs font-bold text-black shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all"
            >
              Criar Conta Grátis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 px-6">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-amber-500/10 blur-[140px] pointer-events-none rounded-full" />

        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-bold text-amber-400 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>O SaaS mais inteligente e lucrativo para Barbearias</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Não seja apenas uma agenda.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500">
              Recupere receita e dobre a frequência
            </span>{' '}
            dos seus clientes.
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            O BarberFlow calcula o intervalo de corte de cada cliente, avisa quem está sumindo,
            mostra o <strong>Dinheiro Deixado na Mesa</strong> e automatiza lembretes no WhatsApp via n8n.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link
              href="/onboarding"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3.5 text-sm font-bold text-black shadow-xl shadow-amber-500/25 hover:from-amber-400 hover:to-amber-500 transition-all"
            >
              <span>Testar 14 Dias Grátis</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <Link
              href="/login"
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/80 px-6 py-3.5 text-sm font-bold text-white hover:bg-zinc-800 transition-colors"
            >
              <span>Ver Demonstração ao Vivo</span>
            </Link>
          </div>

          {/* Social Proof Stats */}
          <div className="pt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto border-t border-zinc-800/80 text-left">
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <span className="text-2xl font-extrabold text-amber-400 block">+38%</span>
              <span className="text-xs text-zinc-400">Recorrência Média de Cortes</span>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <span className="text-2xl font-extrabold text-emerald-400 block">-70%</span>
              <span className="text-xs text-zinc-400">Redução em Faltas (No-Show)</span>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <span className="text-2xl font-extrabold text-white block">45s</span>
              <span className="text-xs text-zinc-400">Tempo para Agendar sem Login</span>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <span className="text-2xl font-extrabold text-blue-400 block">100%</span>
              <span className="text-xs text-zinc-400">Integrado com n8n & WhatsApp</span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: Dinheiro Deixado na Mesa */}
      <section id="recorrencia" className="py-16 px-6 bg-[#0E1015] border-y border-zinc-800/80">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400 border border-amber-500/30">
              <Flame className="h-3.5 w-3.5" />
              <span>O Segredo da Recorrência</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Descubra quanto dinheiro sua barbearia está deixando na mesa.
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
              A maioria dos barbeiros espera o cliente lembrar de cortar o cabelo. O BarberFlow analisa o intervalo individual de cada cliente (mediana matemática) e alerta exatamente quando um cliente passou do prazo habitual, calculando a receita em risco em tempo real.
            </p>
            <ul className="space-y-2.5 text-xs text-zinc-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Cálculo individual de ciclos (não usa números fixos genéricos).</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Classificação automática: Novo, Ativo, Em Risco, Inativo e VIP.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Disparo de reativação no WhatsApp em 1-Clique com mensagem personalizada.</span>
              </li>
            </ul>
          </div>

          <div className="p-6 rounded-2xl border border-amber-500/30 bg-[#14171C] shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#22262E] pb-3">
              <span className="text-xs font-bold text-amber-400 uppercase">Dinheiro na Mesa</span>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                Recuperável
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400">
              R$ 1.350,00
            </div>
            <p className="text-xs text-zinc-400">
              Estimativa de receita que você pode recuperar trazendo de volta 18 clientes em risco nesta semana.
            </p>
            <div className="space-y-2 pt-2">
              <div className="p-2.5 rounded-lg bg-[#0D0F12] border border-[#22262E] flex justify-between text-xs items-center">
                <div>
                  <span className="font-bold text-white block">Rodrigo Pereira</span>
                  <span className="text-[11px] text-zinc-500">Último corte há 36 dias (Ciclo normal: 25d)</span>
                </div>
                <span className="font-bold text-rose-400">+11 dias atraso</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#0D0F12] border border-[#22262E] flex justify-between text-xs items-center">
                <div>
                  <span className="font-bold text-white block">Marcelo Santos</span>
                  <span className="text-[11px] text-zinc-500">Último corte há 42 dias (Ciclo normal: 28d)</span>
                </div>
                <span className="font-bold text-rose-400">+14 dias atraso</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION: Features Grid */}
      <section id="funcionalidades" className="py-16 px-6 max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Tudo o que sua barbearia precisa, sem complexidade desnecessária.
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto">
            Projetado por quem entende a rotina corrida de uma barbearia real.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl border border-[#22262E] bg-[#14171C] space-y-3 shadow-xl">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <Calendar className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-white text-base">Agenda Anti-Conflito</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Zero overbooking. Bloqueio automático de sobreposições com locks atômicos no backend e visualização por dia e semana.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-[#22262E] bg-[#14171C] space-y-3 shadow-xl">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
              <Smartphone className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-white text-base">Link Público em 45s</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Página personalizada para sua barbearia com agendamento direto pelo cliente sem exigir criação de conta. Inclui QR Code para balcão.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-[#22262E] bg-[#14171C] space-y-3 shadow-xl">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-white text-base">Automações com n8n</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Webhooks com assinatura HMAC-SHA256 para disparar confirmações, lembretes de horário, solicitações de Google Reviews e campanhas de aniversário.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-[#22262E] bg-[#14171C] space-y-3 shadow-xl">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
              <TrendingUp className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-white text-base">Financeiro & Comissões</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Controle de faturamento em tempo real (hoje, semana, mês), cálculo automático de repasse de comissões por barbeiro e ticket médio.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-[#22262E] bg-[#14171C] space-y-3 shadow-xl">
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-white text-base">Histórico & Perfil 360°</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Linha do tempo de cada atendimento do cliente, serviços preferidos, notas de corte e controle de no-show para reduzir faltas.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-[#22262E] bg-[#14171C] space-y-3 shadow-xl">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-white text-base">Multi-Tenancy Seguro</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Isolamento estrito entre unidades e barbearias. Seus dados e clientes são 100% protegidos e privados.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="planos" className="py-16 px-6 bg-[#0E1015] border-t border-zinc-800/80">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Planos simples e transparentes.
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Sem taxas escondidas. Cancele quando quiser.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Starter */}
            <div className="p-6 rounded-2xl border border-[#22262E] bg-[#14171C] space-y-5 flex flex-col justify-between">
              <div className="space-y-3">
                <h3 className="font-bold text-white text-base">Starter</h3>
                <p className="text-xs text-zinc-400">Para barbearias individuais ou autônomos</p>
                <div className="text-3xl font-extrabold text-white">
                  R$ 59 <span className="text-xs font-normal text-zinc-400">/mês</span>
                </div>
                <ul className="space-y-2 text-xs text-zinc-300 pt-3 border-t border-[#22262E]">
                  <li>✓ Até 2 Barbeiros</li>
                  <li>✓ Agenda e Agendamento Público</li>
                  <li>✓ Motor de Recorrência Básico</li>
                  <li>✓ Gestão de Clientes</li>
                </ul>
              </div>
              <Link
                href="/onboarding"
                className="w-full text-center py-2.5 rounded-lg border border-zinc-700 bg-zinc-800 text-xs font-bold text-white hover:bg-zinc-700 transition-colors block"
              >
                Começar Agora
              </Link>
            </div>

            {/* Pro (Highlighted) */}
            <div className="p-6 rounded-2xl border-2 border-amber-500 bg-gradient-to-b from-amber-500/10 to-[#14171C] space-y-5 flex flex-col justify-between shadow-2xl relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[10px] font-extrabold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-md">
                Mais Escolhido
              </div>
              <div className="space-y-3">
                <h3 className="font-bold text-white text-base">Profissional</h3>
                <p className="text-xs text-zinc-400">Para barbearias em crescimento</p>
                <div className="text-3xl font-extrabold text-amber-400">
                  R$ 119 <span className="text-xs font-normal text-zinc-400">/mês</span>
                </div>
                <ul className="space-y-2 text-xs text-zinc-300 pt-3 border-t border-amber-500/30">
                  <li>✓ Barbeiros Ilimitados</li>
                  <li>✓ <strong>Dinheiro na Mesa Completo</strong></li>
                  <li>✓ <strong>Integração com n8n & Webhooks</strong></li>
                  <li>✓ QR Code do Balcão</li>
                  <li>✓ Relatórios Financeiros & Comissões</li>
                </ul>
              </div>
              <Link
                href="/onboarding"
                className="w-full text-center py-2.5 rounded-lg bg-amber-500 text-xs font-bold text-black hover:bg-amber-400 transition-all block shadow-lg shadow-amber-500/20"
              >
                Experimentar 14 Dias Grátis
              </Link>
            </div>

            {/* Scale */}
            <div className="p-6 rounded-2xl border border-[#22262E] bg-[#14171C] space-y-5 flex flex-col justify-between">
              <div className="space-y-3">
                <h3 className="font-bold text-white text-base">Redes & Franquias</h3>
                <p className="text-xs text-zinc-400">Múltiplas unidades e alta demanda</p>
                <div className="text-3xl font-extrabold text-white">
                  R$ 229 <span className="text-xs font-normal text-zinc-400">/mês</span>
                </div>
                <ul className="space-y-2 text-xs text-zinc-300 pt-3 border-t border-[#22262E]">
                  <li>✓ Múltiplas Barbearias / Tenants</li>
                  <li>✓ Suporte Prioritário VIP</li>
                  <li>✓ Servidor Dedicado / Webhooks ilimitados</li>
                  <li>✓ Auditoria e Logs Avançados</li>
                </ul>
              </div>
              <Link
                href="/onboarding"
                className="w-full text-center py-2.5 rounded-lg border border-zinc-700 bg-zinc-800 text-xs font-bold text-white hover:bg-zinc-700 transition-colors block"
              >
                Falar com Consultor
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-zinc-800 bg-[#0A0C0F] py-8 px-6 text-center text-xs text-zinc-500 space-y-2">
        <div className="flex items-center justify-center gap-2 text-zinc-300 font-bold">
          <Scissors className="h-4 w-4 text-amber-400" />
          <span>BarberFlow — Plataforma SaaS para Barbearias</span>
        </div>
        <p>© 2026 BarberFlow. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
