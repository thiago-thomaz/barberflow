'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminShell } from '@/components/Admin/AdminShell';
import { AdminDataTable, Column } from '@/components/Admin/AdminDataTable';
import { AdminConfirmModal } from '@/components/Admin/AdminConfirmModal';
import { Store, Eye, Ban, CheckCircle, RefreshCw, Phone, MapPin, Calendar, ExternalLink } from 'lucide-react';

interface BarbershopRow {
  id: string;
  name: string;
  slug: string;
  phone: string;
  city: string;
  isActive: boolean;
  createdAt: string;
  owner: { name: string; email: string } | null;
  subscription: {
    status: string;
    planName: string;
    planTier: string;
    price: number;
    currentPeriodEnd: string;
    trialEndsAt: string | null;
  } | null;
  counts: {
    barbers: number;
    services: number;
    customers: number;
    appointments: number;
    users: number;
  };
  whatsappActive: boolean;
}

export default function AdminBarbershopsPage() {
  const [barbershops, setBarbershops] = useState<BarbershopRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShop, setSelectedShop] = useState<BarbershopRow | null>(null);
  const [modalAction, setModalAction] = useState<'SUSPEND' | 'REACTIVATE' | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadBarbershops = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/barbershops');
      if (!res.ok) throw new Error('Erro ao carregar barbearias');
      const json = await res.json();
      setBarbershops(json.data || []);
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: err.message || 'Erro ao carregar barbearias' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBarbershops();
  }, []);

  const handleToggleStatus = async (reason: string) => {
    if (!selectedShop || !modalAction) return;

    const newActiveState = modalAction === 'REACTIVATE';
    try {
      const res = await fetch(`/api/admin/barbershops/${selectedShop.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: newActiveState,
          reason,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Erro ao atualizar status');
      }

      setFeedback({
        type: 'success',
        message: `Barbearia ${selectedShop.name} foi ${newActiveState ? 'reativada' : 'suspensa'} com sucesso.`,
      });
      loadBarbershops();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const columns: Column<BarbershopRow>[] = [
    {
      key: 'name',
      header: 'Barbearia',
      render: (row) => (
        <div className="space-y-0.5">
          <Link
            href={`/admin/barbearias/${row.id}`}
            className="font-bold text-white hover:text-amber-400 transition-colors flex items-center gap-1.5"
          >
            {row.name}
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </Link>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <span>/{row.slug}</span>
            <span>•</span>
            <span>{row.city}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'owner',
      header: 'Proprietário',
      render: (row) => (
        <div className="space-y-0.5">
          <p className="font-semibold text-slate-200">{row.owner?.name || 'Não atribuído'}</p>
          <p className="text-[11px] text-slate-400 font-mono">{row.owner?.email || '—'}</p>
        </div>
      ),
    },
    {
      key: 'subscription',
      header: 'Plano / Assinatura',
      render: (row) => {
        const sub = row.subscription;
        if (!sub) {
          return <span className="text-slate-500 text-[11px]">Sem assinatura</span>;
        }

        const statusBadges: Record<string, { bg: string; text: string; label: string }> = {
          ACTIVE: { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', label: 'Ativa' },
          TRIALING: { bg: 'bg-sky-500/10 border-sky-500/20', text: 'text-sky-400', label: 'Trial' },
          PAST_DUE: { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400', label: 'Inadimplente' },
          CANCELLED: { bg: 'bg-rose-500/10 border-rose-500/20', text: 'text-rose-400', label: 'Cancelada' },
          EXPIRED: { bg: 'bg-slate-800 border-slate-700', text: 'text-slate-400', label: 'Expirada' },
        };

        const badge = statusBadges[sub.status] || { bg: 'bg-slate-800', text: 'text-slate-400', label: sub.status };

        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-xs">{sub.planName}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase ${badge.bg} ${badge.text}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-[11px] text-amber-400 font-mono">
              R$ {sub.price.toFixed(2)}/mês
            </p>
          </div>
        );
      },
    },
    {
      key: 'counts',
      header: 'Uso / Recursos',
      render: (row) => (
        <div className="text-[11px] text-slate-300 space-y-0.5">
          <p><span className="font-bold text-white">{row.counts?.barbers ?? 0}</span> Barbeiros</p>
          <p><span className="font-bold text-white">{row.counts?.appointments ?? 0}</span> Agendamentos</p>
          <p><span className="font-bold text-white">{row.counts?.customers ?? 0}</span> Clientes</p>
        </div>
      ),
    },
    {
      key: 'isActive',
      header: 'Status da Conta',
      align: 'center',
      render: (row) => (
        <span
          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${
            row.isActive
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}
        >
          {row.isActive ? '🟢 Operacional' : '🔴 Suspensa'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            href={`/admin/barbearias/${row.id}`}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1A1E29] transition-colors"
            title="Visão 360º"
          >
            <Eye className="w-4 h-4" />
          </Link>

          {row.isActive ? (
            <button
              onClick={() => {
                setSelectedShop(row);
                setModalAction('SUSPEND');
              }}
              className="p-1.5 rounded-lg text-rose-400 hover:text-white hover:bg-rose-500/20 transition-colors"
              title="Suspender Barbearia"
            >
              <Ban className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => {
                setSelectedShop(row);
                setModalAction('REACTIVATE');
              }}
              className="p-1.5 rounded-lg text-emerald-400 hover:text-white hover:bg-emerald-500/20 transition-colors"
              title="Reativar Barbearia"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminShell
      title="Gestão de Barbearias (Tenants)"
      subtitle="Controle completo de todas as contas, planos, assinaturas e status operacional da rede"
      actions={
        <button
          onClick={loadBarbershops}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#141824] hover:bg-[#1C2130] text-xs font-semibold text-slate-300 border border-[#232733] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          <span>Recarregar</span>
        </button>
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

      <AdminDataTable
        columns={columns}
        data={barbershops}
        searchPlaceholder="Buscar por nome, slug, telefone ou cidade..."
        searchKey={(row) => `${row.name} ${row.slug} ${row.phone} ${row.city} ${row.owner?.name || ''} ${row.owner?.email || ''}`}
        filters={[
          {
            key: (row) => (row.isActive ? 'ACTIVE' : 'INACTIVE'),
            label: 'Status da Conta',
            options: [
              { label: '🟢 Operacional (Ativa)', value: 'ACTIVE' },
              { label: '🔴 Suspensa', value: 'INACTIVE' },
            ],
          },
          {
            key: (row) => row.subscription?.status || 'NONE',
            label: 'Assinatura',
            options: [
              { label: 'Ativas', value: 'ACTIVE' },
              { label: 'Em Trial', value: 'TRIALING' },
              { label: 'Inadimplentes', value: 'PAST_DUE' },
              { label: 'Canceladas', value: 'CANCELLED' },
            ],
          },
        ]}
        isLoading={loading}
        emptyMessage="Nenhuma barbearia encontrada com os filtros atuais."
      />

      {/* Confirmation Modal for Suspensions and Reactivations */}
      {selectedShop && modalAction && (
        <AdminConfirmModal
          isOpen={!!modalAction}
          onClose={() => {
            setModalAction(null);
            setSelectedShop(null);
          }}
          onConfirm={handleToggleStatus}
          title={modalAction === 'SUSPEND' ? 'Suspender Operação da Barbearia' : 'Reativar Operação da Barbearia'}
          targetName={`${selectedShop.name} (/${selectedShop.slug})`}
          description={
            modalAction === 'SUSPEND'
              ? 'A suspensão bloqueará imediatamente o agendamento público e o acesso dos operadores da barbearia aos módulos administrativos.'
              : 'A reativação restaurará o acesso imediato de todos os barbeiros e da agenda pública desta barbearia.'
          }
          impactWarning={
            modalAction === 'SUSPEND'
              ? 'Clientes finais não conseguirão agendar horários nesta barbearia enquanto ela estiver suspensa.'
              : undefined
          }
          confirmWord={modalAction === 'SUSPEND' ? 'SUSPENDER' : undefined}
          confirmButtonText={modalAction === 'SUSPEND' ? 'Confirmar Suspensão' : 'Reativar Conta'}
          variant={modalAction === 'SUSPEND' ? 'danger' : 'info'}
          requireReason={true}
        />
      )}
    </AdminShell>
  );
}
