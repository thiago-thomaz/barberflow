'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminShell } from '@/components/Admin/AdminShell';
import { AdminDataTable, Column } from '@/components/Admin/AdminDataTable';
import { CreditCard, Store, RefreshCw, Calendar, AlertCircle } from 'lucide-react';

interface SubscriptionRow {
  id: string;
  barbershopId: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt: string | null;
  plan: {
    name: string;
    tier: string;
    price: number;
    interval: string;
  };
  barbershop: {
    id: string;
    name: string;
    slug: string;
    phone: string;
    isActive: boolean;
  };
}

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadSubscriptions = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/subscriptions');
      if (!res.ok) throw new Error('Erro ao carregar assinaturas');
      const json = await res.json();
      setSubscriptions(json.data || []);
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const columns: Column<SubscriptionRow>[] = [
    {
      key: 'barbershop',
      header: 'Barbearia (Tenant)',
      render: (row) => (
        <div className="space-y-0.5">
          <Link
            href={`/admin/barbearias/${row.barbershop.id}`}
            className="font-bold text-white hover:text-amber-400 transition-colors flex items-center gap-1.5"
          >
            {row.barbershop.name}
          </Link>
          <p className="text-[11px] text-slate-400 font-mono">/{row.barbershop.slug}</p>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Plano Contratado',
      render: (row) => (
        <div>
          <span className="font-bold text-white text-xs">{row.plan.name}</span>
          <p className="text-[11px] text-amber-400 font-mono">
            R$ {row.plan.price.toFixed(2)} / {row.plan.interval === 'MONTHLY' ? 'mês' : 'ano'}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (row) => {
        const badges: Record<string, { bg: string; text: string; label: string }> = {
          ACTIVE: { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', label: '🟢 Ativa' },
          TRIALING: { bg: 'bg-sky-500/10 border-sky-500/20', text: 'text-sky-400', label: '🧪 Em Trial' },
          PAST_DUE: { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400', label: '⚠️ Inadimplente' },
          CANCELLED: { bg: 'bg-rose-500/10 border-rose-500/20', text: 'text-rose-400', label: '❌ Cancelada' },
          EXPIRED: { bg: 'bg-slate-800 border-slate-700', text: 'text-slate-400', label: '⏹️ Expirada' },
        };
        const badge = badges[row.status] || { bg: 'bg-slate-800', text: 'text-slate-400', label: row.status };

        return (
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${badge.bg} ${badge.text}`}>
            {badge.label}
          </span>
        );
      },
    },
    {
      key: 'period',
      header: 'Vigência / Vencimento',
      render: (row) => (
        <div className="text-[11px] text-slate-300 font-mono space-y-0.5">
          <p>Fim: {new Date(row.currentPeriodEnd).toLocaleDateString('pt-BR')}</p>
          {row.trialEndsAt && (
            <p className="text-sky-400 text-[10px]">
              Trial até: {new Date(row.trialEndsAt).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminShell
      title="Gestão de Assinaturas"
      subtitle="Acompanhamento de contratos, status de renovação e ciclo de faturamento das barbearias"
      actions={
        <button
          onClick={loadSubscriptions}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#141824] hover:bg-[#1C2130] text-xs font-semibold text-slate-300 border border-[#232733] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          <span>Recarregar</span>
        </button>
      }
    >
      {feedback && (
        <div className="mb-6 rounded-2xl p-4 text-xs font-bold border bg-rose-500/10 text-rose-400 border-rose-500/20">
          {feedback.message}
        </div>
      )}

      <AdminDataTable
        columns={columns}
        data={subscriptions}
        searchPlaceholder="Buscar por barbearia..."
        searchKey={(row) => `${row.barbershop?.name || ''} ${row.barbershop?.slug || ''} ${row.plan?.name || ''}`}
        filters={[
          {
            key: 'status',
            label: 'Status da Assinatura',
            options: [
              { label: 'Ativas', value: 'ACTIVE' },
              { label: 'Em Teste (Trial)', value: 'TRIALING' },
              { label: 'Inadimplentes (Past Due)', value: 'PAST_DUE' },
              { label: 'Canceladas', value: 'CANCELLED' },
              { label: 'Expiradas', value: 'EXPIRED' },
            ],
          },
        ]}
        isLoading={loading}
        emptyMessage="Nenhuma assinatura encontrada."
      />
    </AdminShell>
  );
}
