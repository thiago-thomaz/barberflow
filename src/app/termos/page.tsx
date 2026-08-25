import React from 'react';
import Link from 'next/link';
import { Scissors, ArrowLeft, ShieldAlert } from 'lucide-react';

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-[#0D0F12] text-zinc-300">
      <header className="border-b border-[#22262E] bg-[#14171C]/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white font-bold">
            <div className="h-8 w-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-black">
              <Scissors className="h-4 w-4" />
            </div>
            <span>BarberFlow</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar ao início</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3 text-xs text-amber-200">
          <ShieldAlert className="h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <strong>Aviso de Revisão Jurídica:</strong> Este é um documento preliminar de termos de
            uso do software SaaS BarberFlow. Antes do lançamento comercial formal, estes termos
            devem passar por validação e adequação com assessoria jurídica especializada.
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-extrabold text-white">Termos de Uso do BarberFlow</h1>
          <p className="text-xs text-zinc-500 mt-1">Última atualização: 25 de Agosto de 2026</p>
        </div>

        <section className="space-y-4 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white">1. Objeto do Serviço</h2>
          <p>
            O BarberFlow é uma plataforma de software como serviço (SaaS) voltada para barbearias e
            profissionais de beleza, oferecendo gestão de agenda, controle de clientes, cálculo de
            recorrência, relatórios operacionais e envio automatizado de lembretes e notificações.
          </p>

          <h2 className="text-lg font-bold text-white">2. Cadastro e Responsabilidade do Usuário</h2>
          <p>
            Ao se cadastrar, o contratante declara ser titular ou representante legal do
            estabelecimento cadastrado. O usuário é o único responsável pela guarda e
            confidencialidade de suas credenciais de acesso, bem como pela veracidade dos dados
            inseridos na plataforma.
          </p>

          <h2 className="text-lg font-bold text-white">3. Planos, Assinaturas e Cancelamento</h2>
          <p>
            O acesso ao BarberFlow é fornecido mediante assinatura mensal nos planos Starter,
            Profissional ou Business. O contratante pode cancelar sua assinatura a qualquer momento
            através do painel de configurações, mantendo o acesso até o fim do ciclo mensal vigente.
          </p>

          <h2 className="text-lg font-bold text-white">4. Disponibilidade e Suporte</h2>
          <p>
            Empregamos esforços comercialmente razoáveis para manter a plataforma disponível 24 horas
            por dia, 7 dias por semana, ressalvadas paradas para manutenção preventiva ou falhas em
            infraestrutura externa de terceiros.
          </p>
        </section>
      </main>
    </div>
  );
}
