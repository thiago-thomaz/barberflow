'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminShell } from '@/components/Admin/AdminShell';
import { AdminDataTable, Column } from '@/components/Admin/AdminDataTable';
import { DollarSign, Plus, RefreshCw, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface PaymentRow {
  id: string;
  amount: number;
  status: string;
  method: string;
  paidAt: string | null;
  dueDate: string | null;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  barbershop: {
    id: string;
    name: string;
    slug: string;
  };
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [summary, setSummary] = useState<{ totalPaidRevenue: number; totalTransactions: number }>({
    totalPaidRevenue: 0,
    totalTransactions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [barbershops, setBarbershops] = useState<any[]>([]);
  const [form, setForm] = useState({
    barbershopId: '',
    amount: 119.0,
    method: 'PIX',
    status: 'PAID',
    reference: '',
    notes: '',
  });
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/payments');
      if (!res.ok) throw new Error('Erro ao carregar pagamentos');
      const json = await res.json();
      setPayments(json.data || []);
      setSummary(json.summary || { totalPaidRevenue: 0, totalTransactions: 0 });
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const loadBarbershops = async () => {
    try {
      const res = await fetch('/api/admin/barbershops');
      if (res.ok) {
        const json = await res.json();
        setBarbershops(json.data || []);
        if (json.data?.[0]?.id) {
          setForm((prev) => ({ ...prev, barbershopId: json.data[0].id }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadPayments();
    loadBarbershops();
  }, []);

  const handleRecordPayment = async () => {
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Erro ao registrar pagamento');
      }

      setFeedback({ type: 'success', message: 'Pagamento registrado com sucesso no ledger do SaaS!' });
      setIsModalOpen(false);
      loadPayments();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const columns: Column<PaymentRow>[] = [
    {
      key: 'barbershop',
      header: 'Barbearia',
      render: (row) => (
        <div className="space-y-0.5">
          <Link
            href={`/admin/barbearias/${row.barbershop.id}`}
            className="font-bold text-white hover:text-amber-400 transition-colors"
          >
            {row.barbershop.name}
          </Link>
          <p className="text-[11px] text-slate-400 font-mono">/{row.barbershop.slug}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Valor',
      render: (row) => (
        <span className="font-bold text-white font-mono text-xs">
          R$ {row.amount.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'method',
      header: 'Método',
      render: (row) => (
        <span className="text-xs text-slate-300 font-mono font-semibold">
          {row.method}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (row) => {
        const badges: Record<string, { bg: string; text: string; label: string }> = {
          PAID: { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', label: 'Pago' },
          PENDING: { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400', label: 'Pendente' },
          FAILED: { bg: 'bg-rose-500/10 border-rose-500/20', text: 'text-rose-400', label: 'Falhou' },
          REFUNDED: { bg: 'bg-purple-500/10 border-purple-500/20', text: 'text-purple-400', label: 'Estornado' },
        };
        const badge = badges[row.status] || { bg: 'bg-slate-800', text: 'text-slate-400', label: row.status };

        return (
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${badge.bg} ${badge.text}`}>
            {badge.label}
          </span>
        );
      },
    },
    {
      key: 'paidAt',
      header: 'Data de Liquidação',
      render: (row) => (
        <span className="text-xs text-slate-400 font-mono">
          {row.paidAt ? new Date(row.paidAt).toLocaleDateString('pt-BR') : '—'}
        </span>
      ),
    },
  ];

  return (
    <AdminShell
      title="Faturamento & Pagamentos do SaaS"
      subtitle="Ledger de mensalidades, faturas recebidas e histórico de transações da plataforma"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={loadPayments}
            disabled={loading}
            className="p-2 rounded-xl bg-[#141824] text-slate-300 border border-[#232733]"
            title="Recarregar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-black shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Pagamento</span>
          </button>
        </div>
      }
    >
      {feedback && (
        <div
          className={`mb-6 rounded-2xl p-4 text-xs font-bold border ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Summary Banner */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-[#0E1118] border border-[#232733] p-5">
          <p className="text-xs font-semibold text-slate-400">Total Liquidado em Assinaturas</p>
          <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">
            R$ {summary.totalPaidRevenue.toFixed(2)}
          </p>
        </div>
        <div className="rounded-2xl bg-[#0E1118] border border-[#232733] p-5">
          <p className="text-xs font-semibold text-slate-400">Total de Faturas Registradas</p>
          <p className="text-2xl font-black text-white mt-1 font-mono">
            {summary.totalTransactions} transações
          </p>
        </div>
      </div>

      <AdminDataTable
        columns={columns}
        data={payments}
        searchPlaceholder="Buscar por barbearia ou referência..."
        searchKey={(row) => `${row.barbershop?.name || ''} ${row.reference || ''} ${row.method || ''}`}
        filters={[
          {
            key: 'status',
            label: 'Status',
            options: [
              { label: 'Pago', value: 'PAID' },
              { label: 'Pendente', value: 'PENDING' },
              { label: 'Falhou', value: 'FAILED' },
            ],
          },
        ]}
        isLoading={loading}
        emptyMessage="Nenhum pagamento registrado no ledger."
      />

      {/* Modal Manual Payment */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#0E1118] border border-[#232733] p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Registrar Pagamento de Assinatura</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-400">Barbearia:</label>
                <select
                  value={form.barbershopId}
                  onChange={(e) => setForm({ ...form, barbershopId: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-[#141824] border border-[#232733] text-white"
                >
                  {barbershops.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (/{b.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400">Valor da Assinatura (R$):</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-[#141824] border border-[#232733] text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400">Método de Liquidação:</label>
                <select
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl bg-[#141824] border border-[#232733] text-white"
                >
                  <option value="PIX">PIX</option>
                  <option value="CREDIT_CARD">Cartão de Crédito</option>
                  <option value="BOLETO">Boleto Bancário</option>
                  <option value="MANUAL">Acerto Manual / Transferência</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400">Código de Referência / Nota:</label>
                <input
                  type="text"
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  placeholder="Ex: FAT-2026-001"
                  className="w-full mt-1 p-2.5 rounded-xl bg-[#141824] border border-[#232733] text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#232733]">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleRecordPayment}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20"
              >
                Salvar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
