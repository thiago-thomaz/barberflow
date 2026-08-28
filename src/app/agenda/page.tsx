'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/AppShell';
import { Badge } from '@/components/UI/Badge';
import { Modal } from '@/components/UI/Modal';
import { formatCurrency, formatDate, formatTime, formatDateTime } from '@/lib/utils';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  Scissors,
  DollarSign,
  CheckCircle2,
  Play,
  XCircle,
  AlertTriangle,
  UserX,
  CreditCard,
  Banknote,
  QrCode,
  Filter,
} from 'lucide-react';

export default function AgendaPage() {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [barberFilter, setBarberFilter] = useState<string>('ALL');

  const [appointments, setAppointments] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Appointment Modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newForm, setNewForm] = useState({
    customerId: '',
    barberId: '',
    serviceId: '',
    date: new Date().toISOString().split('T')[0],
    time: '14:00',
    notes: '',
    // Inline new customer
    isNewCustomer: false,
    newCustomerName: '',
    newCustomerPhone: '',
  });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  // Manage Selected Appointment Modal
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelInput, setShowCancelInput] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('PIX');

  const fetchInitialData = async () => {
    try {
      const [barbRes, servRes, custRes] = await Promise.all([
        fetch('/api/barbers?active=true'),
        fetch('/api/services?active=true'),
        fetch('/api/customers'),
      ]);
      const [barbData, servData, custData] = await Promise.all([
        barbRes.json(),
        servRes.json(),
        custRes.json(),
      ]);

      if (barbRes.ok) setBarbers(barbData.barbers || []);
      if (servRes.ok) setServices(servData.services || []);
      if (custRes.ok) setCustomers(custData.customers || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      let startDate: string;
      let endDate: string;

      if (viewMode === 'day') {
        const d = new Date(currentDate);
        d.setHours(0, 0, 0, 0);
        startDate = d.toISOString();
        d.setHours(23, 59, 59, 999);
        endDate = d.toISOString();
      } else {
        // Week: start Monday, end Sunday
        const d = new Date(currentDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        startDate = monday.toISOString();

        const sunday = new Date(monday);
        sunday.setDate(sunday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        endDate = sunday.toISOString();
      }

      const params = new URLSearchParams({ startDate, endDate });
      if (barberFilter !== 'ALL') params.set('barberId', barberFilter);

      const res = await fetch(`/api/appointments?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setAppointments(data.appointments || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [currentDate, viewMode, barberFilter]);

  // Date Navigators
  const prevDate = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') d.setDate(d.getDate() - 1);
    else d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const nextDate = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') d.setDate(d.getDate() + 1);
    else d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const openNewAppointment = (defaultTime?: string) => {
    setNewForm({
      customerId: customers[0]?.id || '',
      barberId: barbers[0]?.id || '',
      serviceId: services[0]?.id || '',
      date: currentDate.toISOString().split('T')[0],
      time: defaultTime || '14:00',
      notes: '',
      isNewCustomer: false,
      newCustomerName: '',
      newCustomerPhone: '',
    });
    setFormError('');
    setIsNewModalOpen(true);
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFormError('');

    try {
      let finalCustomerId = newForm.customerId;

      // If inline new customer creation is selected
      if (newForm.isNewCustomer) {
        if (!newForm.newCustomerName || !newForm.newCustomerPhone) {
          throw new Error('Informe o nome e telefone do novo cliente');
        }
        const custRes = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newForm.newCustomerName,
            phone: newForm.newCustomerPhone,
          }),
        });
        const custData = await custRes.json();
        if (!custRes.ok) throw new Error(custData.error || 'Erro ao cadastrar cliente');
        finalCustomerId = custData.customer.id;
        fetchInitialData();
      }

      const scheduledAt = new Date(`${newForm.date}T${newForm.time}:00`);

      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: finalCustomerId,
          barberId: newForm.barberId,
          serviceId: newForm.serviceId,
          scheduledAt: scheduledAt.toISOString(),
          notes: newForm.notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao agendar horário');

      setIsNewModalOpen(false);
      fetchAppointments();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setCreating(false);
    }
  };

  // Status Action Handlers
  const handleConfirm = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/appointments/${id}/confirm`, { method: 'POST' });
      if (res.ok) {
        setSelectedApp(null);
        fetchAppointments();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleStart = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/appointments/${id}/start`, { method: 'POST' });
      if (res.ok) {
        setSelectedApp(null);
        fetchAppointments();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/appointments/${id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: paymentMethod }),
      });
      if (res.ok) {
        setSelectedApp(null);
        fetchAppointments();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/appointments/${id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason || 'Cancelado a pedido' }),
      });
      if (res.ok) {
        setSelectedApp(null);
        setShowCancelInput(false);
        setCancelReason('');
        fetchAppointments();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleNoShow = async (id: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/appointments/${id}/no-show`, { method: 'POST' });
      if (res.ok) {
        setSelectedApp(null);
        fetchAppointments();
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Time slots for Day View (from 08:00 to 20:30)
  const timeSlots = [];
  for (let h = 8; h <= 20; h++) {
    timeSlots.push(`${String(h).padStart(2, '0')}:00`);
    timeSlots.push(`${String(h).padStart(2, '0')}:30`);
  }

  // Days for Week View
  const getWeekDays = () => {
    const d = new Date(currentDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const days = [];
    for (let i = 0; i < 7; i++) {
      const current = new Date(monday);
      current.setDate(current.getDate() + i);
      days.push(current);
    }
    return days;
  };

  return (
    <AppShell
      title="Agenda da Barbearia"
      subtitle="Controle diário e semanal de horários, barbeiros e atendimentos"
      actions={
        <button
          onClick={() => openNewAppointment()}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-bold text-black shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Agendamento</span>
        </button>
      }
    >
      <div className="space-y-4">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-[#14171C] p-4 rounded-xl border border-[#22262E]">
          {/* Date Navigator */}
          <div className="flex items-center gap-2">
            <button
              onClick={prevDate}
              className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 hover:bg-zinc-700"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs font-semibold text-amber-400 border border-zinc-700 hover:bg-zinc-700"
            >
              Hoje
            </button>
            <button
              onClick={nextDate}
              className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 hover:bg-zinc-700"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <span className="ml-2 font-bold text-sm text-white capitalize">
              {currentDate.toLocaleDateString('pt-BR', {
                weekday: 'short',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>

          {/* View Mode & Barber Filter */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {/* Filter by Barber */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-zinc-500 hidden sm:inline">Barbeiro:</span>
              <select
                value={barberFilter}
                onChange={(e) => setBarberFilter(e.target.value)}
                className="rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-2.5 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
              >
                <option value="ALL">Todos os Barbeiros</option>
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex rounded-lg bg-[#0D0F12] border border-[#22262E] p-1">
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'day'
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Dia
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                  viewMode === 'week'
                    ? 'bg-amber-500 text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Semana
              </button>
            </div>
          </div>
        </div>

        {/* DAY VIEW */}
        {viewMode === 'day' && (
          <div className="space-y-4">
            {/* Quick summary bar if there are appointments */}
            {appointments.length > 0 && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <Clock className="h-4 w-4" />
                  <span>{appointments.length} Agendamento(s) para este dia</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {appointments.map((app) => (
                    <button
                      key={app.id}
                      onClick={() => setSelectedApp(app)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-2.5 py-1 text-xs text-zinc-200 hover:border-amber-500 hover:text-white transition-all shadow-sm"
                    >
                      <span className="font-mono font-bold text-amber-400">{formatTime(app.scheduledAt)}</span>
                      <span className="font-medium text-white">{app.customer?.name}</span>
                      <span className="text-[10px] text-zinc-500">({app.barber?.name?.split(' ')[0]})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-[#22262E] bg-[#14171C] p-4">
              <div className="divide-y divide-[#22262E]/60">
                {timeSlots.map((slot) => {
                  const slotAppointments = appointments.filter((app) => {
                    const appTime = formatTime(app.scheduledAt);
                    return appTime === slot;
                  });

                return (
                  <div key={slot} className="py-2 flex items-start gap-4 min-h-[52px]">
                    <div className="w-14 text-xs font-mono font-bold text-zinc-500 pt-1">
                      {slot}
                    </div>

                    <div className="flex-1">
                      {slotAppointments.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {slotAppointments.map((app) => (
                            <div
                              key={app.id}
                              onClick={() => setSelectedApp(app)}
                              className="p-3 rounded-lg border border-[#2A2E35] bg-[#0D0F12] hover:border-amber-500/50 transition-all cursor-pointer shadow-sm hover:shadow-amber-500/5 group"
                            >
                              <div className="flex items-start justify-between">
                                <div className="font-bold text-white text-xs group-hover:text-amber-400 transition-colors">
                                  {app.customer?.name}
                                </div>
                                <Badge status={app.status} size="sm" />
                              </div>
                              <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-400">
                                <span>{app.service?.name || app.serviceNameSnapshot}</span>
                                <span className="font-semibold text-emerald-400">
                                  {formatCurrency(app.price)}
                                </span>
                              </div>
                              <div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-500">
                                <span>✂️ {app.barber?.name}</span>
                                <span>•</span>
                                <span>⏱️ {app.durationMinutes} min</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <button
                          onClick={() => openNewAppointment(slot)}
                          className="w-full text-left py-1 text-xs text-zinc-600 hover:text-amber-400/80 transition-colors flex items-center gap-1 group"
                        >
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                            + Agendar às {slot}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* WEEK VIEW */}
        {viewMode === 'week' && (
          <div className="rounded-xl border border-[#22262E] bg-[#14171C] p-4 overflow-x-auto">
            <div className="grid grid-cols-7 gap-2 min-w-[700px]">
              {getWeekDays().map((dayDate, idx) => {
                const isToday =
                  dayDate.toISOString().split('T')[0] ===
                  new Date().toISOString().split('T')[0];

                const dayAppointments = appointments.filter((app) => {
                  const aDate = new Date(app.scheduledAt).toISOString().split('T')[0];
                  return aDate === dayDate.toISOString().split('T')[0];
                });

                return (
                  <div
                    key={idx}
                    className={`rounded-lg border p-2.5 min-h-[300px] flex flex-col ${
                      isToday
                        ? 'border-amber-500/40 bg-amber-500/5'
                        : 'border-[#22262E] bg-[#0D0F12]'
                    }`}
                  >
                    <div className="border-b border-[#22262E] pb-2 text-center mb-2">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block capitalize">
                        {dayDate.toLocaleDateString('pt-BR', { weekday: 'short' })}
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          isToday ? 'text-amber-400' : 'text-white'
                        }`}
                      >
                        {dayDate.getDate()}
                      </span>
                    </div>

                    <div className="space-y-1.5 flex-1">
                      {dayAppointments.map((app) => (
                        <div
                          key={app.id}
                          onClick={() => setSelectedApp(app)}
                          className="p-1.5 rounded bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 transition-colors cursor-pointer text-[11px]"
                        >
                          <div className="font-bold text-white truncate">
                            {new Date(app.scheduledAt).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            - {app.customer?.name}
                          </div>
                          <div className="text-[10px] text-zinc-400 truncate">
                            {app.service?.name} ({app.barber?.name?.split(' ')[0]})
                          </div>
                          <div className="mt-1">
                            <Badge status={app.status} size="sm" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal: Novo Agendamento */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Criar Novo Agendamento"
        subtitle="Selecione o cliente, serviço, barbeiro e horário"
        maxWidth="lg"
      >
        {formError && (
          <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300">
            {formError}
          </div>
        )}
        <form onSubmit={handleCreateAppointment} className="space-y-3">
          {/* Customer Selection or Inline New */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold uppercase text-zinc-400">Cliente *</label>
              <button
                type="button"
                onClick={() =>
                  setNewForm({ ...newForm, isNewCustomer: !newForm.isNewCustomer })
                }
                className="text-xs text-amber-400 hover:underline font-medium"
              >
                {newForm.isNewCustomer ? 'Selecionar da lista' : '+ Cadastrar novo cliente'}
              </button>
            </div>

            {newForm.isNewCustomer ? (
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-[#0D0F12] border border-[#22262E]">
                <input
                  type="text"
                  required
                  placeholder="Nome do cliente"
                  value={newForm.newCustomerName}
                  onChange={(e) =>
                    setNewForm({ ...newForm, newCustomerName: e.target.value })
                  }
                  className="rounded border border-[#2A2E35] bg-zinc-900 px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                />
                <input
                  type="text"
                  required
                  placeholder="WhatsApp / Telefone"
                  value={newForm.newCustomerPhone}
                  onChange={(e) =>
                    setNewForm({ ...newForm, newCustomerPhone: e.target.value })
                  }
                  className="rounded border border-[#2A2E35] bg-zinc-900 px-2.5 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none"
                />
              </div>
            ) : (
              <select
                value={newForm.customerId}
                onChange={(e) => setNewForm({ ...newForm, customerId: e.target.value })}
                className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Service and Barber */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                Serviço *
              </label>
              <select
                value={newForm.serviceId}
                onChange={(e) => setNewForm({ ...newForm, serviceId: e.target.value })}
                className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {formatCurrency(s.price)} ({s.durationMin} min)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                Barbeiro *
              </label>
              <select
                value={newForm.barberId}
                onChange={(e) => setNewForm({ ...newForm, barberId: e.target.value })}
                className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
              >
                {barbers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                Data *
              </label>
              <input
                type="date"
                required
                value={newForm.date}
                onChange={(e) => setNewForm({ ...newForm, date: e.target.value })}
                className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                Horário *
              </label>
              <select
                value={newForm.time}
                onChange={(e) => setNewForm({ ...newForm, time: e.target.value })}
                className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
              >
                {timeSlots.map((ts) => (
                  <option key={ts} value={ts}>
                    {ts}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
              Observações
            </label>
            <input
              type="text"
              placeholder="Ex: Cliente prefere máquina 2 nas laterais"
              value={newForm.notes}
              onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })}
              className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
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
              {creating ? 'Confirmando...' : 'Confirmar Agendamento'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Ações e Detalhes do Agendamento */}
      <Modal
        isOpen={!!selectedApp}
        onClose={() => {
          setSelectedApp(null);
          setShowCancelInput(false);
        }}
        title="Detalhes do Atendimento"
        subtitle={`Agendamento para ${formatDateTime(selectedApp?.scheduledAt)}`}
      >
        {selectedApp && (
          <div className="space-y-4">
            <div className="rounded-lg bg-[#0D0F12] border border-[#22262E] p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Cliente:</span>
                <span className="font-bold text-white">{selectedApp.customer?.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Telefone:</span>
                <span className="font-mono text-zinc-300">{selectedApp.customer?.phone}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Barbeiro:</span>
                <span className="font-medium text-amber-400">{selectedApp.barber?.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Serviço:</span>
                <span className="font-medium text-white">{selectedApp.service?.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Valor / Duração:</span>
                <span className="font-bold text-emerald-400">
                  {formatCurrency(selectedApp.price)} ({selectedApp.durationMinutes} min)
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
                <span className="text-zinc-400">Status Atual:</span>
                <Badge status={selectedApp.status} size="sm" />
              </div>
            </div>

            {/* Quick Actions based on status */}
            <div className="space-y-2 pt-2 border-t border-[#22262E]">
              <h4 className="text-[11px] font-bold uppercase text-zinc-400">Ações do Horário</h4>

              <div className="grid grid-cols-2 gap-2">
                {selectedApp.status === 'AGENDADO' && (
                  <button
                    onClick={() => handleConfirm(selectedApp.id)}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-bold hover:bg-amber-500/30"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Confirmar
                  </button>
                )}

                {(selectedApp.status === 'AGENDADO' || selectedApp.status === 'CONFIRMADO') && (
                  <button
                    onClick={() => handleStart(selectedApp.id)}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/40 text-xs font-bold hover:bg-purple-500/30"
                  >
                    <Play className="h-3.5 w-3.5" /> Iniciar Atendimento
                  </button>
                )}

                {selectedApp.status !== 'CONCLUIDO' && selectedApp.status !== 'CANCELADO' && (
                  <div className="col-span-2 space-y-2 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-400">
                        Concluir e Receber Pagamento:
                      </span>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="rounded bg-zinc-900 border border-zinc-800 text-[11px] text-white px-2 py-1 focus:outline-none"
                      >
                        <option value="PIX">PIX</option>
                        <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                        <option value="CARTAO_DEBITO">Cartão de Débito</option>
                        <option value="DINHEIRO">Dinheiro</option>
                      </select>
                    </div>
                    <button
                      onClick={() => handleComplete(selectedApp.id)}
                      disabled={actionLoading}
                      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-400"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Concluir Atendimento (
                      {formatCurrency(selectedApp.price)})
                    </button>
                  </div>
                )}
              </div>

              {/* Cancellation & No-Show */}
              {selectedApp.status !== 'CONCLUIDO' && selectedApp.status !== 'CANCELADO' && (
                <div className="pt-2 border-t border-[#22262E] flex justify-between gap-2">
                  {showCancelInput ? (
                    <div className="w-full space-y-2">
                      <input
                        type="text"
                        placeholder="Motivo do cancelamento (opcional)"
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="w-full rounded border border-rose-500/40 bg-zinc-900 px-2.5 py-1.5 text-xs text-white focus:outline-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setShowCancelInput(false)}
                          className="text-xs text-zinc-400 hover:text-white"
                        >
                          Voltar
                        </button>
                        <button
                          onClick={() => handleCancel(selectedApp.id)}
                          disabled={actionLoading}
                          className="px-3 py-1 rounded bg-rose-500 text-xs font-bold text-white hover:bg-rose-600"
                        >
                          Confirmar Cancelamento
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowCancelInput(true)}
                        className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Cancelar Horário
                      </button>

                      <button
                        onClick={() => handleNoShow(selectedApp.id)}
                        className="text-xs text-zinc-400 hover:text-zinc-300 flex items-center gap-1"
                      >
                        <UserX className="h-3.5 w-3.5" /> Marcar Não Compareceu (No-Show)
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#22262E]">
              <button
                onClick={() => setSelectedApp(null)}
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
