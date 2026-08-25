'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/AppShell';
import { Modal } from '@/components/UI/Modal';
import { Scissors, Plus, Clock, DollarSign, Edit2, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function ServicosPage() {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    durationMin: '30',
    price: '40.00',
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/services');
      const data = await res.json();
      if (res.ok) setServices(data.services || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const openNewModal = () => {
    setEditingService(null);
    setForm({
      name: '',
      description: '',
      durationMin: '30',
      price: '40.00',
      isActive: true,
    });
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (service: any) => {
    setEditingService(service);
    setForm({
      name: service.name,
      description: service.description || '',
      durationMin: String(service.durationMin || 30),
      price: String(service.price || 0),
      isActive: service.isActive,
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const url = editingService ? `/api/services/${editingService.id}` : '/api/services';
      const method = editingService ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          durationMin: parseInt(form.durationMin, 10),
          price: parseFloat(form.price),
          isActive: form.isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar serviço');

      setIsModalOpen(false);
      fetchServices();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (service: any) => {
    try {
      await fetch(`/api/services/${service.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !service.isActive }),
      });
      fetchServices();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AppShell
      title="Catálogo de Serviços"
      subtitle="Defina os serviços oferecidos, tempo de cadeira e valores"
      actions={
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-bold text-black shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Serviço</span>
        </button>
      }
    >
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-zinc-500">Carregando catálogo de serviços...</div>
        ) : services.length === 0 ? (
          <div className="rounded-xl border border-[#22262E] bg-[#14171C] p-12 text-center space-y-3">
            <Scissors className="h-8 w-8 mx-auto text-zinc-600" />
            <p className="text-sm text-zinc-400">Nenhum serviço cadastrado.</p>
            <button
              onClick={openNewModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-amber-400 border border-zinc-700 hover:bg-zinc-700"
            >
              <Plus className="h-3.5 w-3.5" /> Adicionar Serviço
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((s) => (
              <div
                key={s.id}
                className="rounded-xl border border-[#22262E] bg-[#14171C] p-5 relative overflow-hidden transition-all hover:border-zinc-700 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <h3 className="font-bold text-white text-sm">{s.name}</h3>
                    <button
                      onClick={() => toggleStatus(s)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                        s.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                      }`}
                    >
                      {s.isActive ? 'Ativo' : 'Inativo'}
                    </button>
                  </div>

                  <p className="mt-1.5 text-xs text-zinc-400 line-clamp-2">
                    {s.description || 'Sem descrição cadastrada'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#22262E] flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-bold text-amber-400 text-base">
                      {formatCurrency(s.price)}
                    </span>
                    <span className="flex items-center gap-1 text-zinc-400">
                      <Clock className="h-3.5 w-3.5 text-zinc-500" />
                      {s.durationMin} min
                    </span>
                  </div>

                  <button
                    onClick={() => openEditModal(s)}
                    className="text-xs text-zinc-400 hover:text-white font-medium"
                  >
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Cadastro/Edição de Serviço */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingService ? 'Editar Serviço' : 'Novo Serviço'}
        subtitle="Preencha os detalhes e duração do serviço"
      >
        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300">
            {error}
          </div>
        )}
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
              Nome do Serviço *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Corte Degrade + Lavagem"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
              Descrição (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Lavagem especial, corte com máquina e tesoura e finalização."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                Preço (R$) *
              </label>
              <input
                type="number"
                step="0.50"
                min="0"
                required
                placeholder="40.00"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                Duração (Minutos) *
              </label>
              <input
                type="number"
                step="5"
                min="5"
                required
                placeholder="30"
                value={form.durationMin}
                onChange={(e) => setForm({ ...form, durationMin: e.target.value })}
                className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isServiceActive"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-amber-500"
            />
            <label htmlFor="isServiceActive" className="text-xs text-zinc-300 font-medium">
              Serviço ativo para novos agendamentos
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#22262E]">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-bold text-black hover:bg-amber-400 disabled:opacity-50"
            >
              {submitting ? 'Salvando...' : 'Salvar Serviço'}
            </button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
