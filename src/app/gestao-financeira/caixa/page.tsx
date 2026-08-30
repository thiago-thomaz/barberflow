'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { StatCard } from '@/components/UI/StatCard';
import { Badge } from '@/components/UI/Badge';
import { Modal } from '@/components/UI/Modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Wallet,
  Lock,
  Unlock,
  PlusCircle,
  MinusCircle,
  CheckCircle2,
  AlertTriangle,
  History,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react';

export default function CaixaDiarioPage() {
  const [openRegister, setOpenRegister] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [defaultAccount, setDefaultAccount] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [initialBalance, setInitialBalance] = useState('0.00');

  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementType, setMovementType] = useState<'SANGRIA' | 'SUPRIMENTO'>('SANGRIA');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementDesc, setMovementDesc] = useState('');

  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [actualBalance, setActualBalance] = useState('');
  const [closeNotes, setCloseNotes] = useState('');
  const [closeSummary, setCloseSummary] = useState<any | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchCaixa = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/financial-management/cash-register');
      const data = await res.json();
      if (res.ok) {
        setOpenRegister(data.openRegister);
        setHistory(data.history || []);
        setDefaultAccount(data.defaultAccount);
      }
    } catch (err) {
      console.error('Error loading cash register:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaixa();
  }, []);

  const handleOpenCaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/financial-management/cash-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'OPEN',
          initialBalance: parseFloat(initialBalance || '0'),
          accountId: defaultAccount?.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error || 'Erro ao abrir caixa.');
        return;
      }

      setIsOpenModalOpen(false);
      await fetchCaixa();
    } finally {
      setSubmitting(false);
    }
  };

  const handleMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementAmount || Number(movementAmount) <= 0) {
      setErrorMsg('Informe um valor válido.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/financial-management/cash-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MOVEMENT',
          type: movementType,
          amount: parseFloat(movementAmount),
          description: movementDesc,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error || 'Erro ao registrar movimentação.');
        return;
      }

      setIsMovementModalOpen(false);
      setMovementAmount('');
      setMovementDesc('');
      await fetchCaixa();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseCaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/financial-management/cash-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CLOSE',
          actualBalance: parseFloat(actualBalance || '0'),
          notes: closeNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Erro ao fechar caixa.');
        return;
      }

      setCloseSummary(data.summary);
      await fetchCaixa();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      title="Controle de Caixa Diário"
      subtitle="Abertura, fechamento, sangrias, suprimentos de troco e conferência de caixa"
      actions={
        openRegister ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setMovementType('SUPRIMENTO');
                setMovementDesc('Suprimento de Troco');
                setIsMovementModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-3 py-2 text-xs font-bold transition-all"
            >
              <PlusCircle className="h-4 w-4" />
              <span>+ Suprimento</span>
            </button>
            <button
              onClick={() => {
                setMovementType('SANGRIA');
                setMovementDesc('Sangria de Caixa');
                setIsMovementModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 px-3 py-2 text-xs font-bold transition-all"
            >
              <MinusCircle className="h-4 w-4" />
              <span>- Sangria</span>
            </button>
            <button
              onClick={() => {
                setActualBalance(openRegister.currentExpected?.toString() || '0');
                setIsCloseModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black px-3.5 py-2 text-xs font-bold transition-all shadow-md shadow-amber-500/20"
            >
              <Lock className="h-4 w-4" />
              <span>Fechar Caixa</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsOpenModalOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
          >
            <Unlock className="h-4 w-4" />
            <span>Abrir Caixa do Dia</span>
          </button>
        )
      }
    >
      <div className="space-y-6">
        {/* SUBNAV / NAVIGATION TABS */}
        <div className="flex items-center gap-2 bg-[#14171C] p-2 rounded-xl border border-[#22262E] overflow-x-auto">
          {[
            { href: '/gestao-financeira', label: 'Visão Geral', active: false },
            { href: '/gestao-financeira/receber', label: 'Contas a Receber', active: false },
            { href: '/gestao-financeira/pagar', label: 'Contas a Pagar', active: false },
            { href: '/gestao-financeira/fluxo-caixa', label: 'Fluxo de Caixa', active: false },
            { href: '/gestao-financeira/caixa', label: 'Caixa Diário', active: true },
            { href: '/gestao-financeira/relatorios', label: 'Relatórios & CSV', active: false },
          ].map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                tab.active
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {/* CURRENT CASH REGISTER STATUS */}
        {openRegister ? (
          <div className="p-5 rounded-xl bg-gradient-to-r from-[#14171C] to-[#181B22] border border-amber-500/30 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#22262E] pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Unlock className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">Caixa em Operação</h3>
                    <Badge variant="success">ABERTO</Badge>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Aberto em {formatDate(openRegister.openedAt)} ({openRegister.account?.name || 'Caixa Balcão'})
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-zinc-400 block">Saldo Esperado em Caixa:</span>
                <span className="text-2xl font-bold font-mono text-amber-400">
                  {formatCurrency(openRegister.currentExpected || 0)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3 bg-[#0D0F12] rounded-lg border border-[#22262E]">
                <span className="text-xs text-zinc-400 block">Fundo de Troco Inicial:</span>
                <span className="text-sm font-bold font-mono text-zinc-200">
                  {formatCurrency(openRegister.initialBalance)}
                </span>
              </div>
              <div className="p-3 bg-[#0D0F12] rounded-lg border border-[#22262E]">
                <span className="text-xs text-zinc-400 block">Entradas / Dinheiro:</span>
                <span className="text-sm font-bold font-mono text-emerald-400">
                  +
                  {formatCurrency(
                    openRegister.transactions
                      ?.filter((t: any) => t.type === 'INCOME')
                      .reduce((acc: number, t: any) => acc + t.amount, 0) || 0
                  )}
                </span>
              </div>
              <div className="p-3 bg-[#0D0F12] rounded-lg border border-[#22262E]">
                <span className="text-xs text-zinc-400 block">Saídas / Sangrias:</span>
                <span className="text-sm font-bold font-mono text-rose-400">
                  -
                  {formatCurrency(
                    openRegister.transactions
                      ?.filter((t: any) => t.type === 'EXPENSE')
                      .reduce((acc: number, t: any) => acc + t.amount, 0) || 0
                  )}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-xl bg-[#14171C] border border-[#22262E] text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-white">Nenhum Caixa Aberto no Momento</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Abra o caixa diário para começar a registrar atendimentos em dinheiro, sangrias e suprimentos de troco com conferência automática.
            </p>
            <button
              onClick={() => setIsOpenModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
            >
              <Unlock className="h-4 w-4" />
              <span>Abrir Caixa Agora</span>
            </button>
          </div>
        )}

        {/* CLOSED CAIXA HISTORY */}
        <div className="rounded-xl border border-[#22262E] bg-[#14171C] overflow-hidden shadow-xl">
          <div className="p-4 border-b border-[#22262E] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-amber-400" />
              <h3 className="font-bold text-white text-sm">Histórico de Fechamentos de Caixa</h3>
            </div>
            <span className="text-xs text-zinc-500">Últimos caixas conferidos</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-500">Carregando histórico de caixa...</div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500">
              Nenhum fechamento registrado no histórico recente.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="border-b border-[#22262E] text-[11px] font-semibold uppercase tracking-wider text-zinc-500 bg-[#0D0F12]">
                  <tr>
                    <th className="py-3 px-4">Abertura</th>
                    <th className="py-3 px-4">Fechamento</th>
                    <th className="py-3 px-4">Saldo Inicial</th>
                    <th className="py-3 px-4">Saldo Esperado</th>
                    <th className="py-3 px-4">Saldo Contado</th>
                    <th className="py-3 px-4">Diferença</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#22262E]/60">
                  {history.map((c) => {
                    const diff = c.difference || 0;
                    const isOk = Math.abs(diff) <= 0.01;
                    const isSobra = diff > 0.01;
                    const isFalta = diff < -0.01;

                    return (
                      <tr key={c.id} className="hover:bg-[#1A1D23]/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-zinc-400">{formatDate(c.openedAt)}</td>
                        <td className="py-3 px-4 font-mono text-zinc-400">
                          {c.closedAt ? formatDate(c.closedAt) : '-'}
                        </td>
                        <td className="py-3 px-4 font-mono">{formatCurrency(c.initialBalance)}</td>
                        <td className="py-3 px-4 font-mono font-semibold text-zinc-200">
                          {formatCurrency(c.expectedBalance)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          {formatCurrency(c.actualBalance || 0)}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold">
                          {isOk ? (
                            <span className="text-emerald-400">R$ 0,00 (Exato)</span>
                          ) : isSobra ? (
                            <span className="text-emerald-400">+{formatCurrency(diff)} (Sobra)</span>
                          ) : (
                            <span className="text-rose-400">{formatCurrency(diff)} (Falta)</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isOk ? (
                            <Badge variant="success">Bateu</Badge>
                          ) : isSobra ? (
                            <Badge variant="info">Sobra</Badge>
                          ) : (
                            <Badge variant="danger">Falta</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ABRIR CAIXA */}
      <Modal isOpen={isOpenModalOpen} onClose={() => setIsOpenModalOpen(false)} title="Abrir Caixa do Dia">
        <form onSubmit={handleOpenCaixa} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs font-semibold text-rose-400">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">Fundo de Troco Inicial (R$)</label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              className="w-full rounded-lg bg-[#0D0F12] border border-[#22262E] px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
            />
            <span className="text-[11px] text-zinc-500 mt-1 block">
              Valor em espécie presente na gaveta/balcão no início do expediente.
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#22262E]">
            <button
              type="button"
              onClick={() => setIsOpenModalOpen(false)}
              className="px-3.5 py-2 rounded-lg bg-zinc-800 text-xs font-semibold text-zinc-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all disabled:opacity-50"
            >
              {submitting ? 'Abrindo...' : 'Confirmar Abertura'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: SANGRIA / SUPRIMENTO */}
      <Modal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        title={movementType === 'SANGRIA' ? 'Registrar Sangria (Retirada)' : 'Registrar Suprimento (Troco)'}
      >
        <form onSubmit={handleMovement} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs font-semibold text-rose-400">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={movementAmount}
              onChange={(e) => setMovementAmount(e.target.value)}
              className="w-full rounded-lg bg-[#0D0F12] border border-[#22262E] px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">Motivo / Descrição</label>
            <input
              type="text"
              required
              placeholder={movementType === 'SANGRIA' ? 'Ex: Depósito bancário, pagamento de água' : 'Ex: Troco de moedas'}
              value={movementDesc}
              onChange={(e) => setMovementDesc(e.target.value)}
              className="w-full rounded-lg bg-[#0D0F12] border border-[#22262E] px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#22262E]">
            <button
              type="button"
              onClick={() => setIsMovementModalOpen(false)}
              className="px-3.5 py-2 rounded-lg bg-zinc-800 text-xs font-semibold text-zinc-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-4 py-2 rounded-lg text-white text-xs font-bold transition-all disabled:opacity-50 ${
                movementType === 'SANGRIA'
                  ? 'bg-rose-600 hover:bg-rose-500'
                  : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              {submitting ? 'Salvando...' : 'Confirmar Movimentação'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: FECHAR CAIXA */}
      <Modal isOpen={isCloseModalOpen} onClose={() => setIsCloseModalOpen(false)} title="Conferência e Fechamento de Caixa">
        {closeSummary ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center space-y-1">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
              <h4 className="font-bold text-white text-sm">Caixa Fechado com Sucesso!</h4>
              <p className="text-xs text-zinc-300">
                Resultado do caixa:{' '}
                <strong>
                  {closeSummary.hasSobra
                    ? `Sobra de ${formatCurrency(closeSummary.difference)}`
                    : closeSummary.hasFalta
                    ? `Falta de ${formatCurrency(Math.abs(closeSummary.difference))}`
                    : 'Conferência exata sem divergência'}
                </strong>
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsCloseModalOpen(false);
                  setCloseSummary(null);
                }}
                className="px-4 py-2 rounded-lg bg-amber-500 text-black text-xs font-bold"
              >
                Concluir
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCloseCaixa} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs font-semibold text-rose-400">
                {errorMsg}
              </div>
            )}

            <div className="p-3 bg-[#0D0F12] border border-[#22262E] rounded-lg">
              <span className="text-xs text-zinc-400 block">Saldo Esperado pelo Sistema:</span>
              <span className="text-lg font-bold font-mono text-amber-400">
                {formatCurrency(openRegister?.currentExpected || 0)}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Valor Contado em Gaveta (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={actualBalance}
                onChange={(e) => setActualBalance(e.target.value)}
                className="w-full rounded-lg bg-[#0D0F12] border border-[#22262E] px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono text-base"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Observações do Fechamento</label>
              <textarea
                rows={2}
                placeholder="Ex: Tudo correto, troco conferido."
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                className="w-full rounded-lg bg-[#0D0F12] border border-[#22262E] px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#22262E]">
              <button
                type="button"
                onClick={() => setIsCloseModalOpen(false)}
                className="px-3.5 py-2 rounded-lg bg-zinc-800 text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all disabled:opacity-50"
              >
                {submitting ? 'Fechando...' : 'Confirmar Fechamento'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </AppShell>
  );
}
