import React from 'react';
import Link from 'next/link';
import { Scissors, ArrowLeft, ShieldCheck, ShieldAlert } from 'lucide-react';

export default function PrivacidadePage() {
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
            <strong>Aviso de Revisão Jurídica:</strong> Esta Política de Privacidade reflete a
            arquitetura técnica de conformidade LGPD do BarberFlow. Recomenda-se homologação com DPO
            ou assessoria jurídica antes de disponibilização comercial final.
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-extrabold text-white">Política de Privacidade</h1>
          <p className="text-xs text-zinc-500 mt-1">Conformidade com a LGPD (Lei nº 13.709/2018)</p>
        </div>

        <section className="space-y-4 text-sm leading-relaxed">
          <h2 className="text-lg font-bold text-white">1. Coleta de Dados e Finalidade</h2>
          <p>
            O BarberFlow processa dados estritamente necessários para a prestação dos serviços de
            agendamento e gestão operacional: nome, telefone/WhatsApp, histórico de atendimentos e
            preferências de serviço.
          </p>

          <h2 className="text-lg font-bold text-white">2. Papel de Operador e Controlador</h2>
          <p>
            A barbearia assinante atua como <strong>Controladora</strong> dos dados de seus
            clientes finais. O BarberFlow atua como <strong>Operador</strong> da infraestrutura de
            software, processando as informações exclusivamente para execução do contrato com a
            barbearia.
          </p>

          <h2 className="text-lg font-bold text-white">3. Direitos dos Titulares de Dados</h2>
          <p>
            Garantimos o pleno exercício dos direitos previstos no Artigo 18 da LGPD:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-zinc-400">
            <li>
              <strong>Acesso e Exportação:</strong> Exportação estruturada em JSON dos dados
              cadastrais e histórico.
            </li>
            <li>
              <strong>Direito ao Esquecimento / Anonimização:</strong> Anonimização irreversível dos
              dados pessoais mantendo a integridade estatística agregada.
            </li>
            <li>
              <strong>Opt-out de Marketing:</strong> Desativação imediata de mensagens promocionais
              e notificações automatizadas.
            </li>
          </ul>

          <h2 className="text-lg font-bold text-white">4. Segurança e Criptografia</h2>
          <p>
            Utilizamos criptografia em trânsito (TLS/HTTPS), hash criptográfico bcrypt para senhas e
            mecanismos de isolamento multitenant que impedem o compartilhamento não autorizado de
            dados entre diferentes estabelecimentos.
          </p>
        </section>
      </main>
    </div>
  );
}
