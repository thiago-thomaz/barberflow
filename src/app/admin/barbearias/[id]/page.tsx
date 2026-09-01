'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AdminShell } from '@/components/Admin/AdminShell';
import { AdminConfirmModal } from '@/components/Admin/AdminConfirmModal';
import {
  Store,
  Users,
  CreditCard,
  Calendar,
  Phone,
  MapPin,
  Clock,
  ArrowLeft,
  Ban,
  CheckCircle,
  Activity,
  DollarSign,
  ShieldAlert,
  Edit,
  Save,
  X
} from 'lucide-react';

export default function AdminBarbershopDetailPage() {
  const params = useParams();
  const router = useRouter();
  const barbershopId = params.id as string;

  const [shop, setShop] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    planId: '',
    subscriptionStatus: '',
  });

  // Modal actions
  const [modalAction, setModalAction] = useState<'SUSPEND' | 'REACTIVATE' | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [resShop, resPlans] = await Promise.all([
        fetch(`/api/admin/barbershops/${barbershopId}`),
        fetch('/api/admin/plans'),
      ]);

      if (!resShop.ok) {
        throw new Error('Barbearia não encontrada');
      }

      const jsonShop = await resShop.json();
      const jsonPlans = await resPlans.json();

      setShop(jsonShop.data);
      setPlans(jsonPlans.data || []);

      const currentSub = jsonShop.data.subscriptions?.[0];
      setEditForm({
        name: jsonShop.data.name || '',
        phone: jsonShop.data.phone || '',
        address: jsonShop.data.address || '',
        city: jsonShop.data.city || '',
        state: jsonShop.data.state || '',
        planId: currentSub?.planId || '',
        subscriptionStatus: currentSub?.status || 'ACTIVE',
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao carregar dados da barbearia.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (barbershopId) {
      loadData();
    }
  }, [barbershopId]);

  const handleSaveEdit = async () => {
    try {
      const res = await fetch(`/api/admin/barbershops/${barbershopId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          reason: 'Edição de dados e plano via Admin 360',
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Erro ao salvar alterações');
      }

      setFeedback({ type: 'success', message: 'Dados da barbearia atualizados com sucesso!' });
      setIsEditing(false);
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleToggleStatus = async (reason: string) => {
    if (!modalAction) return;
    const newActive = modalAction === 'REACTIVATE';
    try {
      const res = await fetch(`/api/admin/barbershops/${barbershopId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: newActive,
          reason,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Erro ao alterar status');
      }

      setFeedback({
        type: 'success',
        message: `Barbearia ${newActive ? 'reativada' : 'suspensa'} com sucesso.`,
      });
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  if (loading) {
    return (
      <AdminShell title="Carregando...">
        <div className="py-20 text-center text-slate-400">Carregando visão 360 da barbearia...</div>
      </AdminShell>
    );
  }

  if (error || !shop) {
    return (
      <AdminShell title="Erro">
        <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-6 text-center text-rose-400">
          <p className="font-bold">{error || 'Barbearia não encontrada'}</p>
          <button
            onClick={() => router.push('/admin/barbearias')}
            className="mt-4 px-4 py-2 rounded-xl bg-[#141824] text-xs font-semibold text-white"
          >
            Voltar para listagem
          </button>
        </div>
      </AdminShell>
    );
  }

  const activeSub = shop.subscriptions?.[0] || null;

  return (
    <AdminShell
      title={`Visão 360º — ${shop.name}`}
      subtitle={`Identificador: ${shop.id} • Slug: /${shop.slug}`}
      actions={
        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/barbearias"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#141824] hover:bg-[#1C2130] text-xs font-semibold text-slate-300 border border-[#232733] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </Link>

          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-black shadow-lg shadow-amber-500/20 transition-all"
            >
              <Edit className="w-4 h-4" />
              <span>Editar Dados & Plano</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#141824] hover:bg-[#1C2130] text-xs font-semibold text-slate-400 border border-[#232733]"
              >
                <X className="w-4 h-4" />
                <span>Cancelar</span>
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/20"
              >
                <Save className="w-4 h-4" />
                <span>Salvar</span>
              </button>
            </div>
          )}

          {shop.isActive ? (
            <button
              onClick={() => setModalAction('SUSPEND')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-xs font-bold text-rose-400 border border-rose-500/30 transition-colors"
            >
              <Ban className="w-4 h-4" />
              <span>Suspender</span>
            </button>
          ) : (
            <button
              onClick={() => setModalAction('REACTIVATE')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-xs font-bold text-emerald-400 border border-emerald-500/30 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Reativar</span>
            </button>
          )}
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

      {/* Row 1: Key Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="rounded-2xl bg-[#0E1118] border border-[#232733] p-4">
          <p className="text-[11px] text-slate-400 font-semibold">Status Operacional</p>
          <div className="mt-1">
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border uppercase ${
                shop.isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              {shop.isActive ? '🟢 Ativa' : '🔴 Suspensa'}
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-[#0E1118] border border-[#232733] p-4">
          <p className="text-[11px] text-slate-400 font-semibold">Plano Ativo</p>
          <p className="text-sm font-black text-white mt-1">
            {activeSub?.plan?.name || 'Sem Plano'}
          </p>
          <p className="text-[10px] text-amber-400 font-mono">
            {activeSub?.plan ? `R$ ${activeSub.plan.price.toFixed(2)}/mês` : '—'}
          </p>
        </div>

        <div className="rounded-2xl bg-[#0E1118] border border-[#232733] p-4">
          <p className="text-[11px] text-slate-400 font-semibold">Total de Agendamentos</p>
          <p className="text-xl font-black text-white mt-1">{shop._count?.appointments ?? 0}</p>
          <p className="text-[10px] text-slate-400">Na base histórica</p>
        </div>

        <div className="rounded-2xl bg-[#0E1118] border border-[#232733] p-4">
          <p className="text-[11px] text-slate-400 font-semibold">Clientes Cadastrados</p>
          <p className="text-xl font-black text-sky-400 mt-1">{shop._count?.customers ?? 0}</p>
          <p className="text-[10px] text-slate-400">Contatos no tenant</p>
        </div>
      </div>

      {/* Row 2: General Info & Subscription details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Info Card */}
        <div className="lg:col-span-2 rounded-2xl bg-[#0E1118] border border-[#232733] p-5 shadow-sm">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-[#1C202C] mb-4">
            <Store className="w-4 h-4 text-amber-400" />
            Dados Cadastrais da Barbearia
          </h3>

          {!isEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400 text-[11px]">Nome Fantasia</p>
                <p className="font-bold text-white mt-0.5">{shop.name}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Slug Público</p>
                <p className="font-mono text-amber-400 mt-0.5">https://barberflow.com/b/{shop.slug}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Telefone / WhatsApp</p>
                <p className="text-slate-200 mt-0.5">{shop.phone || '—'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Endereço / Cidade</p>
                <p className="text-slate-200 mt-0.5">
                  {shop.address ? `${shop.address}, ${shop.city || ''} - ${shop.state || ''}` : 'Não informado'}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Data de Criação</p>
                <p className="text-slate-200 mt-0.5">{new Date(shop.createdAt).toLocaleDateString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[11px]">Motor WhatsApp</p>
                <p className="text-emerald-400 font-bold mt-0.5">
                  {shop.whatsappActive ? 'Ativo' : 'Desativado'}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-400">Nome:</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full mt-1 p-2 rounded-xl bg-[#141824] border border-[#232733] text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400">Telefone:</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full mt-1 p-2 rounded-xl bg-[#141824] border border-[#232733] text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400">Cidade:</label>
                <input
                  type="text"
                  value={editForm.city}
                  onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                  className="w-full mt-1 p-2 rounded-xl bg-[#141824] border border-[#232733] text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400">Estado (UF):</label>
                <input
                  type="text"
                  value={editForm.state}
                  onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                  className="w-full mt-1 p-2 rounded-xl bg-[#141824] border border-[#232733] text-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400">Plano do SaaS:</label>
                <select
                  value={editForm.planId}
                  onChange={(e) => setEditForm({ ...editForm, planId: e.target.value })}
                  className="w-full mt-1 p-2 rounded-xl bg-[#141824] border border-[#232733] text-white"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — R$ {p.price.toFixed(2)}/mês
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400">Status da Assinatura:</label>
                <select
                  value={editForm.subscriptionStatus}
                  onChange={(e) => setEditForm({ ...editForm, subscriptionStatus: e.target.value })}
                  className="w-full mt-1 p-2 rounded-xl bg-[#141824] border border-[#232733] text-white"
                >
                  <option value="ACTIVE">ACTIVE (Ativa)</option>
                  <option value="TRIALING">TRIALING (Em Teste)</option>
                  <option value="PAST_DUE">PAST_DUE (Inadimplente)</option>
                  <option value="CANCELLED">CANCELLED (Cancelada)</option>
                  <option value="EXPIRED">EXPIRED (Expirada)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Users / Barbers list */}
        <div className="rounded-2xl bg-[#0E1118] border border-[#232733] p-5 shadow-sm">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-[#1C202C] mb-4">
            <Users className="w-4 h-4 text-sky-400" />
            Profissionais & Barbeiros
          </h3>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {shop.barbers?.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">Nenhum barbeiro cadastrado.</p>
            ) : (
              shop.barbers?.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between p-2.5 rounded-xl bg-[#141824] text-xs">
                  <div>
                    <p className="font-bold text-white">{b.name}</p>
                    <p className="text-[10px] text-slate-400">{b.phone || 'Sem telefone'}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold">
                    {b.commission}% comissão
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Recent Appointments & Audit Log for this Tenant */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Appointments */}
        <div className="rounded-2xl bg-[#0E1118] border border-[#232733] p-5 shadow-sm">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-[#1C202C] mb-4">
            <Calendar className="w-4 h-4 text-amber-400" />
            Agendamentos Recentes da Barbearia
          </h3>

          <div className="space-y-2">
            {shop.recentAppointments?.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">Nenhum agendamento recente.</p>
            ) : (
              shop.recentAppointments?.map((app: any) => (
                <div key={app.id} className="p-2.5 rounded-xl bg-[#141824] text-xs flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white">{app.customer?.name || 'Cliente'}</p>
                    <p className="text-[11px] text-slate-400">
                      {app.service?.name} • Barbeiro: {app.barber?.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {new Date(app.scheduledAt).toLocaleDateString('pt-BR')}
                    </span>
                    <p className="text-[11px] font-bold text-amber-400 mt-0.5">R$ {app.price.toFixed(2)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Audit History */}
        <div className="rounded-2xl bg-[#0E1118] border border-[#232733] p-5 shadow-sm">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-[#1C202C] mb-4">
            <Activity className="w-4 h-4 text-sky-400" />
            Histórico Administrativo (Auditoria)
          </h3>

          <div className="space-y-2">
            {shop.auditHistory?.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">Nenhuma ação administrativa registrada nesta conta.</p>
            ) : (
              shop.auditHistory?.map((log: any) => (
                <div key={log.id} className="p-2.5 rounded-xl bg-[#141824] text-xs flex items-center justify-between">
                  <div>
                    <span className="font-mono font-bold text-amber-400 text-[11px]">{log.action}</span>
                    <p className="text-[11px] text-slate-400">Por: {log.adminUser?.name}</p>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(log.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {modalAction && (
        <AdminConfirmModal
          isOpen={!!modalAction}
          onClose={() => setModalAction(null)}
          onConfirm={handleToggleStatus}
          title={modalAction === 'SUSPEND' ? 'Suspender Barbearia' : 'Reativar Barbearia'}
          targetName={`${shop.name} (/${shop.slug})`}
          description={
            modalAction === 'SUSPEND'
              ? 'A suspensão bloqueará imediatamente os agendamentos públicos e o acesso ao painel da barbearia.'
              : 'A reativação restaurará o acesso total e a agenda pública imediatamente.'
          }
          confirmWord={modalAction === 'SUSPEND' ? 'SUSPENDER' : undefined}
          confirmButtonText={modalAction === 'SUSPEND' ? 'Confirmar Suspensão' : 'Reativar Barbearia'}
          variant={modalAction === 'SUSPEND' ? 'danger' : 'info'}
          requireReason={true}
        />
      )}
    </AdminShell>
  );
}
