'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Scissors, ArrowLeft, Mail, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao processar');

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0D0F12] p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-black shadow-lg shadow-amber-500/20">
            <Scissors className="h-6 w-6" />
          </div>
          <h1 className="mt-3 text-xl font-bold text-white">Recuperar Senha</h1>
          <p className="text-xs text-zinc-400">
            Digite seu e-mail cadastrado para receber o link de redefinição
          </p>
        </div>

        <div className="rounded-2xl border border-[#22262E] bg-[#14171C] p-6 shadow-2xl space-y-4">
          {error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {submitted ? (
            <div className="text-center space-y-3 py-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-white text-sm">Verifique sua caixa de entrada</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Se o e-mail <strong>{email}</strong> estiver cadastrado, enviamos um link seguro para
                redefinir sua senha.
              </p>
              <Link
                href="/login"
                className="inline-block mt-3 text-xs font-bold text-amber-400 hover:underline"
              >
                Voltar para o login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-amber-500 py-2.5 text-xs font-bold text-black hover:bg-amber-400 transition-all disabled:opacity-50"
              >
                {loading ? 'Enviando link...' : 'Enviar Link de Recuperação'}
              </button>

              <div className="text-center pt-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Voltar para o login</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
