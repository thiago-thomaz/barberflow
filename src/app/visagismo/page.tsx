'use client';

import React from 'react';
import Link from 'next/link';
import { Scissors, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';

export default function VisagismoPublicEntry() {
  return (
    <div className="min-h-screen bg-[#0D0F12] text-zinc-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md bg-[#14171F] border border-zinc-800 rounded-3xl p-8 space-y-6 shadow-2xl">
        <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500/20 to-amber-400/5 flex items-center justify-center border border-amber-500/30">
          <Scissors className="h-8 w-8 text-amber-400" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            BarberFlow • Visagismo
          </span>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">
            Mude seu Visual ✂️
          </h1>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Descubra cortes, barbas e estilos que combinam com suas características e rotina.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 text-left text-xs space-y-2">
          <p className="font-semibold text-white">Como acessar:</p>
          <p className="text-zinc-400 text-[11px] leading-relaxed">
            Envie <strong>"Mudar visual"</strong> no WhatsApp da sua barbearia para receber seu link personalizado e seguro de 24 horas.
          </p>
        </div>

        <Link
          href="/"
          className="w-full py-3.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition-colors flex items-center justify-center gap-2"
        >
          <span>Ir para Início</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
