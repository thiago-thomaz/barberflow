'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/AppShell';
import { Modal } from '@/components/UI/Modal';
import {
  UserCheck,
  Plus,
  Phone,
  Scissors,
  CheckCircle2,
  XCircle,
  Percent,
  Calendar,
} from 'lucide-react';
import { formatPhone } from '@/lib/utils';

export default function BarbeirosPage() {
  const [barbers, setBarbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<any | null>(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    specialty: '',
    commission: '50',
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchBarbers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/barbers');
      const data = await res.json();
      if (res.ok) setBarbers(data.barbers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBarbers();
  }, []);

  const openNewModal = () => {
    setEditingBarber(null);
    setForm({
      name: '',
      phone: '',
      specialty: 'Cortes degradê, barba com toalha quente',
      commission: '50',
      isActive: true,
    });
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (barber: any) => {
    setEditingBarber(barber);
    setForm({
      name: barber.name,
      phone: barber.phone || '',
      specialty: barber.specialty || '',
      commission: String(barber.commission || 50),
      isActive: barber.isActive,
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const url = editingBarber ? `/api/barbers/${editingBarber.id}` : '/api/barbers';
      const method = editingBarber ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          specialty: form.specialty,
          commission: parseFloat(form.commission) || 0,
          isActive: form.isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar barbeiro');

      setIsModalOpen(false);
      fetchBarbers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (barber: any) => {
    try {
      await fetch(`/api/barbers/${barber.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !barber.isActive }),
      });
      fetchBarbers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AppShell
      title="Equipe de Barbeiros"
      subtitle="Cadastre seus profissionais, especialidades e comissões"
      actions={
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-bold text-black shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Barbeiro</span>
        </button>
      }
    >
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-zinc-500">Carregando profissionais...</div>
        ) : barbers.length === 0 ? (
          <div className="rounded-xl border border-[#22262E] bg-[#14171C] p-12 text-center space-y-3">
            <UserCheck className="h-8 w-8 mx-auto text-zinc-600" />
            <p className="text-sm text-zinc-400">Nenhum barbeiro cadastrado.</p>
            <button
              onClick={openNewModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-amber-400 border border-zinc-700 hover:bg-zinc-700"
            >
              <Plus className="h-3.5 w-3.5" /> Cadastrar Primeiro Barbeiro
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {barbers.map((b) => (
              <div
                key={b.id}
                className="rounded-xl border border-[#22262E] bg-[#14171C] p-5 relative overflow-hidden transition-all hover:border-zinc-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-sm">
                      {b.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">{b.name}</h3>
                      <p className="text-xs text-zinc-400">{b.specialty || 'Barbeiro'}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleStatus(b)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors ${
                      b.isActive
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:bg-zinc-700'
                    }`}
                  >
                    {b.isActive ? 'Ativo' : 'Inativo'}
                  </button>
                </div>

                <div className="mt-4 pt-3 border-t border-[#22262E] grid grid-cols-2 gap-2 text-xs text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-zinc-500" />
                    <span>{b.phone ? formatPhone(b.phone) : 'Sem telefone'}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Percent className="h-3.5 w-3.5 text-zinc-500" />
                    <span>Comissão: {b.commission || 0}%</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#22262E]/60 text-[11px] text-zinc-500">
                  <span>{b._count?.appointments || 0} agendamentos</span>
                  <button
                    onClick={() => openEditModal(b)}
                    className="text-amber-400 hover:underline font-medium"
                  >
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Cadastro/Edição de Barbeiro */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBarber ? 'Editar Barbeiro' : 'Novo Barbeiro'}
        subtitle="Defina o nome, telefone e especialidades do profissional"
      >
        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300">
            {error}
          </div>
        )}
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
              Nome do Barbeiro *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Carlos Mestre"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
              Telefone / WhatsApp
            </label>
            <input
              type="text"
              placeholder="(11) 98888-7777"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
              Especialidade
            </label>
            <input
              type="text"
              placeholder="Ex: Fade, degradê navalhado, barboterapia"
              value={form.specialty}
              onChange={(e) => setForm({ ...form, specialty: e.target.value })}
              className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
              Comissão (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="50"
              value={form.commission}
              onChange={(e) => setForm({ ...form, commission: e.target.value })}
              className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-amber-500"
            />
            <label htmlFor="isActive" className="text-xs text-zinc-300 font-medium">
              Barbeiro ativo para receber agendamentos
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
              {submitting ? 'Salvando...' : 'Salvar Barbeiro'}
            </button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
