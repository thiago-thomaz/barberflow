'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/AppShell';
import { Badge } from '@/components/UI/Badge';
import { Modal } from '@/components/UI/Modal';
import { formatCurrency, formatDate, formatPhone } from '@/lib/utils';
import {
  Users,
  Search,
  Plus,
  Phone,
  Calendar,
  DollarSign,
  Clock,
  Eye,
  Edit2,
  Trash2,
  Filter,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

export default function ClientesPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // New customer modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', phone: '', email: '', notes: '' });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  // Details modal
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);

      const res = await fetch(`/api/customers?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setCustomers(data.customers || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFormError('');

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar cliente');

      setIsNewModalOpen(false);
      setNewForm({ name: '', phone: '', email: '', notes: '' });
      fetchCustomers();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const openCustomerDetails = async (id: string) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/customers/${id}`);
      const data = await res.json();
      if (res.ok) {
        setSelectedCustomer(data.customer);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <AppShell
      title="Gestão de Clientes"
      subtitle="Base completa de clientes, histórico de visitas e preferências"
      actions={
        <button
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-bold text-black shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Cliente</span>
        </button>
      }
    >
      <div className="space-y-4">
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-[#14171C] p-4 rounded-xl border border-[#22262E]">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar por nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs text-zinc-500 flex items-center gap-1">
              <Filter className="h-3 w-3" /> Status:
            </span>
            {['ALL', 'NOVO', 'ATIVO', 'EM_RISCO', 'INATIVO', 'VIP'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-amber-500 text-black font-bold'
                    : 'bg-[#1A1D23] text-zinc-400 hover:text-white border border-[#2A2E35]'
                }`}
              >
                {st === 'ALL' ? 'Todos' : st}
              </button>
            ))}
          </div>
        </div>

        {/* Customer Table */}
        <div className="rounded-xl border border-[#22262E] bg-[#14171C] overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-zinc-500">Carregando clientes...</div>
          ) : customers.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Users className="h-8 w-8 mx-auto text-zinc-600" />
              <p className="text-sm text-zinc-400">Nenhum cliente encontrado.</p>
              <button
                onClick={() => setIsNewModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-amber-400 border border-zinc-700 hover:bg-zinc-700"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar Primeiro Cliente
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="border-b border-[#22262E] bg-[#101216] text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Contato</th>
                    <th className="px-4 py-3">Última Visita</th>
                    <th className="px-4 py-3">Visitas</th>
                    <th className="px-4 py-3">Total Gasto</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#22262E]">
                  {customers.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-[#1A1D23]/60 transition-colors cursor-pointer"
                      onClick={() => openCustomerDetails(c.id)}
                    >
                      <td className="px-4 py-3 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold text-amber-400">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{c.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-400 font-mono">
                        {formatPhone(c.phone)}
                      </td>
                      <td className="px-4 py-3 text-zinc-300">
                        {c.stats?.lastVisitDate ? formatDate(c.stats.lastVisitDate) : 'Nunca'}
                      </td>
                      <td className="px-4 py-3 font-medium text-white">
                        {c.stats?.totalVisits || 0}
                      </td>
                      <td className="px-4 py-3 font-medium text-emerald-400">
                        {formatCurrency(c.stats?.totalSpent || 0)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge status={c.status} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openCustomerDetails(c.id);
                          }}
                          className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                          title="Ver Perfil"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Novo Cliente */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Cadastrar Novo Cliente"
        subtitle="Adicione um cliente à sua base de contatos"
      >
        {formError && (
          <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300">
            {formError}
          </div>
        )}
        <form onSubmit={handleCreateCustomer} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
              Nome Completo *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Gabriel Alves"
              value={newForm.name}
              onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
              className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
              Telefone / WhatsApp *
            </label>
            <input
              type="text"
              required
              placeholder="(11) 98765-4321"
              value={newForm.phone}
              onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })}
              className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
              E-mail (Opcional)
            </label>
            <input
              type="email"
              placeholder="cliente@email.com"
              value={newForm.email}
              onChange={(e) => setNewForm({ ...newForm, email: e.target.value })}
              className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
              Preferências / Observações
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Prefere corte baixo na máquina 1, toalha quente na barba..."
              value={newForm.notes}
              onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })}
              className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#22262E]">
            <button
              type="button"
              onClick={() => setIsNewModalOpen(false)}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-bold text-black hover:bg-amber-400 disabled:opacity-50"
            >
              {creating ? 'Salvando...' : 'Salvar Cliente'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Perfil & Histórico do Cliente */}
      <Modal
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        title={selectedCustomer?.name || 'Perfil do Cliente'}
        subtitle={`Cadastrado em ${formatDate(selectedCustomer?.createdAt)}`}
        maxWidth="lg"
      >
        {selectedCustomer && (
          <div className="space-y-4">
            {/* Quick stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-lg bg-[#0D0F12] border border-[#22262E] p-2.5 text-center">
                <span className="text-[10px] text-zinc-500 uppercase block">Visitas</span>
                <span className="text-base font-bold text-white">
                  {selectedCustomer.stats?.totalVisits || 0}
                </span>
              </div>
              <div className="rounded-lg bg-[#0D0F12] border border-[#22262E] p-2.5 text-center">
                <span className="text-[10px] text-zinc-500 uppercase block">Total Gasto</span>
                <span className="text-base font-bold text-emerald-400">
                  {formatCurrency(selectedCustomer.stats?.totalSpent || 0)}
                </span>
              </div>
              <div className="rounded-lg bg-[#0D0F12] border border-[#22262E] p-2.5 text-center">
                <span className="text-[10px] text-zinc-500 uppercase block">Ticket Médio</span>
                <span className="text-base font-bold text-amber-400">
                  {formatCurrency(selectedCustomer.stats?.avgTicket || 0)}
                </span>
              </div>
              <div className="rounded-lg bg-[#0D0F12] border border-[#22262E] p-2.5 text-center">
                <span className="text-[10px] text-zinc-500 uppercase block">Status</span>
                <div className="mt-0.5">
                  <Badge status={selectedCustomer.status} size="sm" />
                </div>
              </div>
            </div>

            {/* Info details */}
            <div className="rounded-lg bg-[#0D0F12] border border-[#22262E] p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Telefone:</span>
                <span className="font-mono text-white font-medium">
                  {formatPhone(selectedCustomer.phone)}
                </span>
              </div>
              {selectedCustomer.email && (
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">E-mail:</span>
                  <span className="text-zinc-200">{selectedCustomer.email}</span>
                </div>
              )}
              {selectedCustomer.notes && (
                <div>
                  <span className="text-zinc-400 block mb-1">Preferências & Observações:</span>
                  <p className="p-2 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 text-[11px]">
                    {selectedCustomer.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Appointment History */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                Histórico de Atendimentos ({selectedCustomer.appointments?.length || 0})
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {selectedCustomer.appointments?.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic">Nenhum atendimento registrado ainda.</p>
                ) : (
                  selectedCustomer.appointments?.map((app: any) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-[#0D0F12] border border-[#22262E] text-xs"
                    >
                      <div>
                        <div className="font-semibold text-white">
                          {app.service?.name || app.serviceNameSnapshot || 'Serviço'}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {formatDate(app.scheduledAt)} com {app.barber?.name || 'Barbeiro'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-emerald-400">
                          {formatCurrency(app.price)}
                        </div>
                        <Badge status={app.status} size="sm" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#22262E]">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="rounded-lg bg-zinc-800 px-4 py-1.5 text-xs text-white hover:bg-zinc-700 font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
