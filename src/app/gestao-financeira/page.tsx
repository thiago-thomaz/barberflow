'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { StatCard } from '@/components/UI/StatCard';
import { Badge } from '@/components/UI/Badge';
import { Modal } from '@/components/UI/Modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Landmark,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Calendar,
  Wallet,
  PlusCircle,
  ArrowLeftRight,
  Receipt,
  FileText,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Banknote,
  DollarSign,
  Filter,
} from 'lucide-react';

export default function GestaoFinanceiraPage() {
  const [summary, setSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [isNewTransactionModalOpen, setIsNewTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER'>('INCOME');
  const [isPendingBill, setIsPendingBill] = useState(false);

  // Form Fields
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [feeAmount, setFeeAmount] = useState('0');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Reversal Modal
  const [selectedTransactionForReversal, setSelectedTransactionForReversal] = useState<any | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [reversing, setReversing] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [sumRes, transRes, accRes, catRes] = await Promise.all([
        fetch('/api/financial-management/summary'),
        fetch('/api/financial-management/transactions?limit=15'),
        fetch('/api/financial-management/accounts'),
        fetch('/api/financial-management/categories'),
      ]);

      const [sumData, transData, accData, catData] = await Promise.all([
        sumRes.json(),
        transRes.json(),
        accRes.json(),
        catRes.json(),
      ]);

      if (sumRes.ok) setSummary(sumData.summary);
      if (transRes.ok) setTransactions(transData.transactions || []);
      if (accRes.ok) setAccounts(accData.accounts || []);
      if (catRes.ok) setCategories(catData.categories || []);
    } catch (err) {
      console.error('Error loading financial management data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const openModalFor = (type: 'INCOME' | 'EXPENSE' | 'TRANSFER', isPending: boolean = false) => {
    setTransactionType(type);
    setIsPendingBill(isPending);
    setDescription('');
    setAmount('');
    setFeeAmount('0');
    setDueDate('');
    setNotes('');
    setFormError('');
    if (accounts.length > 0) setAccountId(accounts[0].id);
    if (accounts.length > 1) setToAccountId(accounts[1].id);
    setIsNewTransactionModalOpen(true);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || Number(amount) <= 0) {
      setFormError('Preencha a descrição e um valor válido maior que zero.');
      return;
    }

    if (transactionType === 'TRANSFER' && accountId === toAccountId) {
      setFormError('Selecione contas de origem e destino diferentes.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const status = isPendingBill ? 'PENDENTE' : 'CONFIRMADO';

      const res = await fetch('/api/financial-management/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          type: transactionType,
          amount: parseFloat(amount),
          feeAmount: parseFloat(feeAmount || '0'),
          categoryId: categoryId || undefined,
          accountId: accountId || undefined,
          toAccountId: transactionType === 'TRANSFER' ? toAccountId : undefined,
          paymentMethod,
          status,
          dueDate: isPendingBill ? dueDate : undefined,
          notes,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error || 'Erro ao salvar movimentação.');
        return;
      }

      setIsNewTransactionModalOpen(false);
      await fetchDashboardData();
    } catch (err) {
      setFormError('Erro de conexão ao salvar.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmReversal = async () => {
    if (!selectedTransactionForReversal) return;
    setReversing(true);
    try {
      const res = await fetch(`/api/financial-management/transactions/${selectedTransactionForReversal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REVERSE',
          reason: reversalReason || 'Estorno solicitado pelo usuário',
        }),
      });

      if (res.ok) {
        setSelectedTransactionForReversal(null);
        setReversalReason('');
        await fetchDashboardData();
      }
    } finally {
      setReversing(false);
    }
  };

  return (
    <AppShell
      title="Gestão Financeira"
      subtitle="Controle completo de caixa, contas a pagar, contas a receber, fluxo de caixa e relatórios"
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => openModalFor('INCOME', false)}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Nova Entrada</span>
          </button>
          <button
            onClick={() => openModalFor('EXPENSE', false)}
            className="flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white px-3 py-2 text-xs font-bold transition-all shadow-md shadow-rose-600/20"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Nova Despesa</span>
          </button>
          <button
            onClick={() => openModalFor('TRANSFER', false)}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-3 py-2 text-xs font-bold transition-all"
          >
            <ArrowLeftRight className="h-4 w-4 text-amber-400" />
            <span>Transferência</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* SUBNAV / NAVIGATION TABS */}
        <div className="flex items-center gap-2 bg-[#14171C] p-2 rounded-xl border border-[#22262E] overflow-x-auto">
          {[
            { href: '/gestao-financeira', label: 'Visão Geral', active: true },
            { href: '/gestao-financeira/receber', label: 'Contas a Receber', active: false },
            { href: '/gestao-financeira/pagar', label: 'Contas a Pagar', active: false },
            { href: '/gestao-financeira/fluxo-caixa', label: 'Fluxo de Caixa', active: false },
            { href: '/gestao-financeira/caixa', label: 'Caixa Diário', active: false },
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

        {/* 6 TOP KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            title="Saldo em Caixa/Contas"
            value={formatCurrency(summary?.currentTotalBalance || 0)}
            subtitle="Disponível agora"
            icon={Wallet}
            highlight="gold"
          />
          <StatCard
            title="A Receber"
            value={formatCurrency(summary?.totalToReceive || 0)}
            subtitle="Contas pendentes"
            icon={ArrowDownLeft}
            highlight="emerald"
          />
          <StatCard
            title="A Pagar"
            value={formatCurrency(summary?.totalToPay || 0)}
            subtitle="Despesas pendentes"
            icon={ArrowUpRight}
            highlight="rose"
          />
          <StatCard
            title="Entradas do Mês"
            value={formatCurrency(summary?.totalIncomesMonth || 0)}
            subtitle="Receitas realizadas"
            icon={TrendingUp}
            highlight="emerald"
          />
          <StatCard
            title="Saídas do Mês"
            value={formatCurrency(summary?.totalExpensesMonth || 0)}
            subtitle="Despesas pagas"
            icon={TrendingDown}
            highlight="rose"
          />
          <StatCard
            title="Resultado do Mês"
            value={formatCurrency(summary?.monthResult || 0)}
            subtitle={summary?.monthResult >= 0 ? 'Lucro líquido do mês' : 'Prejuízo no mês'}
            icon={Landmark}
            highlight={summary?.monthResult >= 0 ? 'emerald' : 'rose'}
          />
        </div>

        {/* QUICK BUTTONS BAR */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-[#14171C] to-[#181B22] border border-[#22262E] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-amber-400" />
            <span className="text-xs sm:text-sm font-bold text-white">Ações Rápidas de Gestão:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => openModalFor('INCOME', true)}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 border border-zinc-700/80 transition-colors"
            >
              + Conta a Receber
            </button>
            <button
              onClick={() => openModalFor('EXPENSE', true)}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 border border-zinc-700/80 transition-colors"
            >
              + Conta a Pagar
            </button>
            <Link
              href="/gestao-financeira/caixa"
              className="px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-semibold border border-amber-500/30 transition-colors"
            >
              Controle de Caixa
            </Link>
            <Link
              href="/gestao-financeira/fluxo-caixa"
              className="px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-semibold border border-blue-500/30 transition-colors"
            >
              Fluxo de Caixa
            </Link>
          </div>
        </div>

        {/* RECENT FINANCIAL TRANSACTIONS TABLE */}
        <div className="rounded-xl border border-[#22262E] bg-[#14171C] overflow-hidden shadow-xl">
          <div className="p-4 border-b border-[#22262E] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-amber-400" />
              <h3 className="font-bold text-white text-sm">Últimas Movimentações Financeiras</h3>
            </div>
            <span className="text-xs text-zinc-500">Histórico unificado (Entradas, Saídas e Transferências)</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-500">Carregando movimentações...</div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500">
              Sem movimentações no período. Use os botões acima para registrar sua primeira entrada ou despesa.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="border-b border-[#22262E] text-[11px] font-semibold uppercase tracking-wider text-zinc-500 bg-[#0D0F12]">
                  <tr>
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Categoria / Conta</th>
                    <th className="py-3 px-4">Valor</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#22262E]/60">
                  {transactions.map((t) => {
                    const isIncome = t.type === 'INCOME';
                    const isExpense = t.type === 'EXPENSE';
                    const isTransfer = t.type === 'TRANSFER';

                    return (
                      <tr key={t.id} className="hover:bg-[#1A1D23]/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-zinc-400">
                          {t.paidDate ? formatDate(t.paidDate) : t.dueDate ? formatDate(t.dueDate) : formatDate(t.createdAt)}
                        </td>
                        <td className="py-3 px-4 font-medium text-white">
                          <div className="flex items-center gap-1.5">
                            <span>{t.description}</span>
                            {t.isRecurring && (
                              <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/30">
                                Recorrente
                              </span>
                            )}
                          </div>
                          {t.customer && (
                            <div className="text-[11px] text-zinc-500 font-normal">
                              Cliente: {t.customer.name}
                            </div>
                          )}
                          {t.supplier && (
                            <div className="text-[11px] text-zinc-500 font-normal">
                              Fornecedor: {t.supplier.name}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {isIncome && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              <ArrowDownLeft className="h-3 w-3" /> Entrada
                            </span>
                          )}
                          {isExpense && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                              <ArrowUpRight className="h-3 w-3" /> Saída
                            </span>
                          )}
                          {isTransfer && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                              <ArrowLeftRight className="h-3 w-3" /> Transferência
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-zinc-200">
                            {t.category?.name || (isTransfer ? 'Transferência Interna' : 'Geral')}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            {isTransfer
                              ? `${t.account?.name || 'Origem'} → ${t.toAccount?.name || 'Destino'}`
                              : t.account?.name || 'Caixa Balcão'}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold">
                          <span
                            className={
                              isIncome
                                ? 'text-emerald-400'
                                : isExpense
                                ? 'text-rose-400'
                                : 'text-purple-400'
                            }
                          >
                            {isIncome ? '+' : isExpense ? '-' : ''} {formatCurrency(t.amount)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {t.status === 'CONFIRMADO' || t.status === 'PAGO' || t.status === 'RECEBIDO' ? (
                            <Badge variant="success">Efetivado</Badge>
                          ) : t.status === 'PENDENTE' ? (
                            <Badge variant="warning">Pendente</Badge>
                          ) : t.status === 'ESTORNADO' ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                              Estornado
                            </span>
                          ) : (
                            <Badge variant="neutral">{t.status}</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {t.status !== 'ESTORNADO' && t.status !== 'CANCELADO' ? (
                            <button
                              onClick={() => setSelectedTransactionForReversal(t)}
                              title="Estornar movimentação com segurança"
                              className="text-zinc-500 hover:text-rose-400 transition-colors p-1 rounded hover:bg-rose-500/10"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-zinc-600 italic">Sem ação</span>
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

      {/* MODAL: NOVA MOVIMENTAÇÃO / CONTA */}
      <Modal
        isOpen={isNewTransactionModalOpen}
        onClose={() => setIsNewTransactionModalOpen(false)}
        title={
          transactionType === 'TRANSFER'
            ? 'Nova Transferência entre Contas'
            : isPendingBill
            ? transactionType === 'INCOME'
              ? 'Nova Conta a Receber'
              : 'Nova Conta a Pagar'
            : transactionType === 'INCOME'
            ? 'Nova Entrada de Caixa / Receita'
            : 'Nova Despesa / Saída'
        }
      >
        <form onSubmit={handleSaveTransaction} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs font-semibold text-rose-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">Descrição</label>
            <input
              type="text"
              required
              placeholder="Ex: Venda de pomada, Pagamento de Internet, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg bg-[#0D0F12] border border-[#22262E] px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg bg-[#0D0F12] border border-[#22262E] px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
            {transactionType === 'INCOME' && (
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Taxa Cartão (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(e.target.value)}
                  className="w-full rounded-lg bg-[#0D0F12] border border-[#22262E] px-3 py-2 text-xs text-zinc-400 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            )}
          </div>

          {transactionType !== 'TRANSFER' ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Categoria</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-lg bg-[#0D0F12] border border-[#22262E] px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">Selecione a categoria</option>
                  {categories
                    .filter((c) => c.type === transactionType)
                    .map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Conta / Carteira</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full rounded-lg bg-[#0D0F12] border border-[#22262E] px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(acc.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Conta Origem (Sai)</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full rounded-lg bg-[#0D0F12] border border-[#22262E] px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(acc.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1">Conta Destino (Entra)</label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  className="w-full rounded-lg bg-[#0D0F12] border border-[#22262E] px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(acc.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {isPendingBill && (
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Data de Vencimento</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg bg-[#0D0F12] border border-[#22262E] px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-[#22262E]">
            <button
              type="button"
              onClick={() => setIsNewTransactionModalOpen(false)}
              className="px-3.5 py-2 rounded-lg bg-zinc-800 text-xs font-semibold text-zinc-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all disabled:opacity-50"
            >
              {submitting ? 'Salvando...' : 'Confirmar Lançamento'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: CONFIRMAÇÃO DE ESTORNO */}
      <Modal
        isOpen={!!selectedTransactionForReversal}
        onClose={() => setSelectedTransactionForReversal(null)}
        title="Confirmar Estorno Financeiro"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300">
            <strong>Atenção:</strong> O estorno reverterá o saldo da conta e marcará a movimentação como
            estornada no histórico para auditoria sem apagar os dados.
          </div>

          <div>
            <div className="text-xs text-zinc-400">Transação:</div>
            <div className="font-bold text-white text-sm mt-0.5">
              {selectedTransactionForReversal?.description} — {formatCurrency(selectedTransactionForReversal?.amount || 0)}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">Motivo do Estorno</label>
            <input
              type="text"
              placeholder="Ex: Lançamento duplicado, cliente desistiu, etc."
              value={reversalReason}
              onChange={(e) => setReversalReason(e.target.value)}
              className="w-full rounded-lg bg-[#0D0F12] border border-[#22262E] px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#22262E]">
            <button
              type="button"
              onClick={() => setSelectedTransactionForReversal(null)}
              className="px-3.5 py-2 rounded-lg bg-zinc-800 text-xs font-semibold text-zinc-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={reversing}
              onClick={handleConfirmReversal}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all disabled:opacity-50"
            >
              {reversing ? 'Estornando...' : 'Confirmar Estorno'}
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
