'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { StatCard } from '@/components/UI/StatCard';
import { Badge } from '@/components/UI/Badge';
import { Modal } from '@/components/UI/Modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ArrowUpRight,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Building2,
  DollarSign,
} from 'lucide-react';

export default function ContasPagarPage() {
  const [payables, setPayables] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [isRecurring, setIsRecurring] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Settlement Modal (Dar baixa / Pagar)
  const [settlementTarget, setSettlementTarget] = useState<any | null>(null);
  const [settleMethod, setSettleMethod] = useState('PIX');
  const [settleAccount, setSettleAccount] = useState('');
  const [settling, setSettling] = useState(false);

  const fetchPayables = async () => {
    try {
      setLoading(true);
      const [payRes, accRes, catRes, supRes] = await Promise.all([
        fetch('/api/financial-management/transactions?type=EXPENSE&limit=100'),
        fetch('/api/financial-management/accounts'),
        fetch('/api/financial-management/categories'),
        fetch('/api/financial-management/suppliers'),
      ]);

      const [payData, accData, catData, supData] = await Promise.all([
        payRes.json(),
        accRes.json(),
        catRes.json(),
        supRes.json(),
      ]);

      if (payRes.ok) setPayables(payData.transactions || []);
      if (accRes.ok) setAccounts(accData.accounts || []);
      if (catRes.ok) setCategories(catData.categories || []);
      if (supRes.ok) setSuppliers(supData.suppliers || []);
    } catch (err) {
      console.error('Error fetching payables:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayables();
  }, []);

  const totalPending = payables
    .filter((p) => p.status === 'PENDENTE')
    .reduce((acc, p) => acc + p.amount, 0);

  const totalPaidMonth = payables
    .filter((p) => p.status === 'PAGO' || p.status === 'CONFIRMADO')
    .reduce((acc, p) => acc + p.amount, 0);

  const handleCreatePayable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || Number(amount) <= 0 || !dueDate) {
      setErrorMsg('Preencha descrição, valor e data de vencimento.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/financial-management/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          type: 'EXPENSE',
          amount: parseFloat(amount),
          dueDate,
          categoryId: categoryId || undefined,
          accountId: accountId || undefined,
          supplierId: supplierId || undefined,
          paymentMethod,
          isRecurring,
          status: 'PENDENTE',
          notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error || 'Erro ao criar conta a pagar.');
        return;
      }

      setIsModalOpen(false);
      setDescription('');
      setAmount('');
      setDueDate('');
      setNotes('');
      await fetchPayables();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSettle = async () => {
    if (!settlementTarget) return;
    setSettling(true);
    try {
      const res = await fetch(`/api/financial-management/transactions/${settlementTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'PAGO',
          paymentMethod: settleMethod,
          accountId: settleAccount || settlementTarget.accountId,
        }),
      });

      if (res.ok) {
        setSettlementTarget(null);
        await fetchPayables();
      }
    } finally {
      setSettling(false);
    }
  };

  return (
    <AppShell
      title="Contas a Pagar"
      subtitle="Gestão de despesas operacionais, fornecedores, aluguel, água, energia e boletos"
      actions={
        <button
          onClick={() => {
            if (accounts.length > 0) setAccountId(accounts[0].id);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white px-3.5 py-2 text-xs font-bold transition-all shadow-md shadow-rose-600/20"
        >
          <PlusCircle className="h-4 w-4" />
          <span>+ Nova Conta a Pagar</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* SUBNAV / NAVIGATION TABS */}
        <div className="flex items-center gap-2 bg-[#14171C] p-2 rounded-xl border border-[#22262E] overflow-x-auto">
          {[
            { href: '/gestao-financeira', label: 'Visão Geral', active: false },
            { href: '/gestao-financeira/receber', label: 'Contas a Receber', active: false },
            { href: '/gestao-financeira/pagar', label: 'Contas a Pagar', active: true },
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

        {/* METRICS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Total Pendente a Pagar"
            value={formatCurrency(totalPending)}
            subtitle="Despesas a vencer / vencidas"
            icon={ArrowUpRight}
            highlight="rose"
          />
          <StatCard
            title="Pagas no Período"
            value={formatCurrency(totalPaidMonth)}
            subtitle="Despesas já quitadas"
            icon={CheckCircle2}
            highlight="emerald"
          />
          <StatCard
            title="Total de Títulos"
            value={payables.length.toString()}
            subtitle="Despesas cadastradas"
            icon={Calendar}
          />
        </div>

        {/* LIST TABLE */}
        <div className="rounded-xl border border-[#22262E] bg-[#14171C] overflow-hidden shadow-xl">
          <div className="p-4 border-b border-[#22262E] flex items-center justify-between">
            <h3 className="font-bold text-white text-sm">Lista de Contas a Pagar</h3>
            <span className="text-xs text-zinc-500">Despesas e pagamentos a fornecedores</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-500">Carregando contas a pagar...</div>
          ) : payables.length === 0 ? (
            <div className="py-12 text-center text-xs text-zinc-500">
              Nenhuma conta a pagar cadastrada no momento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="border-b border-[#22262E] text-[11px] font-semibold uppercase tracking-wider text-zinc-500 bg-[#0D0F12]">
                  <tr>
                    <th className="py-3 px-4">Vencimento</th>
                    <th className="py-3 px-4">Descrição</th>
                    <th className="py-3 px-4">Fornecedor</th>
                    <th className="py-3 px-4">Categoria / Conta</th>
                    <th className="py-3 px-4">Valor</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#22262E]/60">
                  {payables.map((p) => {
                    const isPending = p.status === 'PENDENTE';
                    const isOverdue =
                      isPending && p.dueDate && new Date(p.dueDate) < new Date();

                    return (
                      <tr key={p.id} className="hover:bg-[#1A1D23]/50 transition-colors">
                        <td className="py-3 px-4 font-mono">
                          {p.dueDate ? formatDate(p.dueDate) : formatDate(p.createdAt)}
                          {isOverdue && (
                            <span className="ml-2 text-[10px] bg-rose-500/20 text-rose-300 px-1 py-0.5 rounded font-bold">
                              Atrasado
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-medium text-white">
                          <div className="flex items-center gap-1.5">
                            <span>{p.description}</span>
                            {p.isRecurring && (
                              <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">
                                Fixa
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-zinc-400">
                          {p.supplier ? p.supplier.name : 'Despesa Geral'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-zinc-200">{p.category?.name || 'Despesa'}</div>
                          <div className="text-[11px] text-zinc-500">{p.account?.name || 'Caixa Balcão'}</div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-rose-400">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="py-3 px-4">
                          {p.status === 'PAGO' || p.status === 'CONFIRMADO' ? (
                            <Badge variant="success">Pago</Badge>
                          ) : isOverdue ? (
                            <Badge variant="danger">Vencido</Badge>
                          ) : (
                            <Badge variant="warning">A Vencer</Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isPending && (
                            <button
                              onClick={() => {
                                setSettlementTarget(p);
                                setSettleMethod(p.paymentMethod || 'PIX');
                                setSettleAccount(p.accountId || (accounts[0]?.id || ''));
                              }}
                              className="px-2.5 py-1 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-[11px] font-bold transition-colors"
                            >
                              Baixar / Pagar
                            </button>
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

      {/* MODAL: NOVA CONTA A PAGAR */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Cadastrar Nova Conta a Pagar"
      >
        <form onSubmit={handleCreatePayable} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs font-semibold text-rose-400">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">Descrição</label>
            <input
              type="text"
              required
              placeholder="Ex: Aluguel do mês, Conta de Energia, Fornecedor de Lâminas"
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Categoria</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-lg bg-[#0D0F12] border border-[#22262E] px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">Selecione categoria</option>
                {categories
                  .filter((c) => c.type === 'EXPENSE')
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Fornecedor (Opcional)</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full rounded-lg bg-[#0D0F12] border border-[#22262E] px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">Sem fornecedor / Geral</option>
                {suppliers.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isRecurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="rounded border-[#22262E] text-amber-500 focus:ring-amber-500 bg-[#0D0F12]"
            />
            <label htmlFor="isRecurring" className="text-xs text-zinc-300 cursor-pointer">
              Conta fixa / recorrente mensal (Ex: Aluguel, Internet)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#22262E]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3.5 py-2 rounded-lg bg-zinc-800 text-xs font-semibold text-zinc-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all disabled:opacity-50"
            >
              {submitting ? 'Salvando...' : 'Salvar Conta a Pagar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL: DAR BAIXA / PAGAR */}
      <Modal
        isOpen={!!settlementTarget}
        onClose={() => setSettlementTarget(null)}
        title="Confirmar Pagamento / Baixa"
      >
        <div className="space-y-4">
          <div>
            <div className="text-xs text-zinc-400">Título:</div>
            <div className="font-bold text-white text-sm mt-0.5">{settlementTarget?.description}</div>
            <div className="font-mono text-rose-400 font-bold text-base mt-1">
              {formatCurrency(settlementTarget?.amount || 0)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Forma de Pagamento</label>
              <select
                value={settleMethod}
                onChange={(e) => setSettleMethod(e.target.value)}
                className="w-full rounded-lg bg-[#0D0F12] border border-[#22262E] px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                <option value="PIX">PIX</option>
                <option value="DINHEIRO">Dinheiro (Caixa)</option>
                <option value="TRANSFERENCIA">Transferência Bancária</option>
                <option value="BOLETO">Boleto Pago</option>
                <option value="CARTAO_DEBITO">Cartão de Débito</option>
                <option value="CARTAO_CREDITO">Cartão de Crédito</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">Conta de Saída</label>
              <select
                value={settleAccount}
                onChange={(e) => setSettleAccount(e.target.value)}
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

          <div className="flex justify-end gap-2 pt-3 border-t border-[#22262E]">
            <button
              type="button"
              onClick={() => setSettlementTarget(null)}
              className="px-3.5 py-2 rounded-lg bg-zinc-800 text-xs font-semibold text-zinc-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={settling}
              onClick={handleSettle}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all disabled:opacity-50"
            >
              {settling ? 'Processando...' : 'Confirmar Pagamento'}
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
