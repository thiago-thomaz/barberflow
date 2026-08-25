'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Scissors,
  MapPin,
  Phone,
  Clock,
  Calendar as CalendarIcon,
  User,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  QrCode,
  Share2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Modal } from '@/components/UI/Modal';

export default function PublicBookingPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [shop, setShop] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<number>(1);

  // Booking selections
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<any | null>(null); // null = "Qualquer"
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Available slots for selected date & service
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);

  // Submission & Result
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [bookedResult, setBookedResult] = useState<any | null>(null);

  // QR Code Modal
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  useEffect(() => {
    async function loadShop() {
      try {
        setLoading(true);
        const res = await fetch(`/api/public/${slug}`);
        const data = await res.json();
        if (res.ok) {
          setShop(data.shop);
        } else {
          setError(data.error || 'Barbearia não encontrada');
        }
      } catch (err) {
        console.error(err);
        setError('Erro ao carregar barbearia');
      } finally {
        setLoading(false);
      }
    }
    if (slug) loadShop();
  }, [slug]);

  // Fetch available slots when step 3 is active or date/barber changes
  useEffect(() => {
    async function fetchSlots() {
      if (!selectedService || !selectedDate) return;
      setLoadingSlots(true);
      try {
        const query = new URLSearchParams({
          date: selectedDate,
          serviceId: selectedService.id,
          barberId: selectedBarber ? selectedBarber.id : 'ANY',
        });
        const res = await fetch(`/api/public/${slug}/available-slots?${query.toString()}`);
        const data = await res.json();
        if (res.ok && data.slots) {
          setAvailableSlots(data.slots.map((s: any) => s.time));
        } else {
          setAvailableSlots([]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSlots(false);
      }
    }
    if (step === 3 && selectedService) {
      fetchSlots();
    }
  }, [step, selectedDate, selectedBarber, selectedService, slug]);

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/public/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: selectedService.id,
          barberId: selectedBarber ? selectedBarber.id : 'ANY',
          date: selectedDate,
          time: selectedTime,
          customerName,
          customerPhone,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao realizar agendamento');

      setBookedResult(data);
      setStep(5); // Success step
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0D0F12] text-zinc-400 text-xs">
        Carregando barbearia...
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0D0F12] p-6 text-center text-zinc-300">
        <Scissors className="h-10 w-10 text-zinc-600 mb-3" />
        <h1 className="text-xl font-bold text-white">Barbearia não encontrada</h1>
        <p className="text-xs text-zinc-500 mt-1">Verifique o endereço e tente novamente.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0F12] text-zinc-100 flex flex-col items-center py-6 px-4 sm:px-6">
      <div className="w-full max-w-xl space-y-6">
        {/* Header da Barbearia */}
        <div className="rounded-2xl border border-[#22262E] bg-[#14171C] p-6 shadow-2xl space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3.5">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-black font-extrabold shadow-lg shadow-amber-500/20">
                <Scissors className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {shop.name}
                </h1>
                <p className="text-xs text-amber-400 font-medium flex items-center gap-1 mt-0.5">
                  <Sparkles className="h-3 w-3" /> Agendamento Online
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsQrModalOpen(true)}
              className="p-2 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 hover:bg-zinc-700 transition-colors"
              title="QR Code do Balcão"
            >
              <QrCode className="h-4 w-4" />
            </button>
          </div>

          <div className="pt-3 border-t border-[#22262E] grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-400">
            {shop.address && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                <span className="truncate">
                  {shop.address}, {shop.city}
                </span>
              </div>
            )}
            {shop.phone && (
              <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                <span>{shop.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Step Indicator */}
        {step < 5 && (
          <div className="flex items-center justify-between px-2">
            {[
              { num: 1, label: 'Serviço' },
              { num: 2, label: 'Profissional' },
              { num: 3, label: 'Horário' },
              { num: 4, label: 'Seus Dados' },
            ].map((s) => (
              <div key={s.num} className="flex flex-col items-center">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    step === s.num
                      ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30'
                      : step > s.num
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50'
                  }`}
                >
                  {step > s.num ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.num}
                </div>
                <span className="text-[10px] text-zinc-400 mt-1 font-medium hidden sm:inline">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* STEP 1: Escolha o Serviço */}
        {step === 1 && (
          <div className="rounded-2xl border border-[#22262E] bg-[#14171C] p-6 shadow-2xl space-y-4">
            <div>
              <h2 className="text-base font-bold text-white">Escolha seu Serviço</h2>
              <p className="text-xs text-zinc-400">Selecione o serviço que deseja realizar</p>
            </div>

            <div className="space-y-2.5">
              {shop.services.map((srv: any) => (
                <div
                  key={srv.id}
                  onClick={() => {
                    setSelectedService(srv);
                    setStep(2);
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                    selectedService?.id === srv.id
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-[#22262E] bg-[#0D0F12] hover:border-zinc-700'
                  }`}
                >
                  <div>
                    <h3 className="font-bold text-white text-sm group-hover:text-amber-400 transition-colors">
                      {srv.name}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">{srv.description}</p>
                    <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 mt-1">
                      <Clock className="h-3 w-3" /> {srv.durationMin} minutos
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="font-extrabold text-amber-400 text-base">
                      {formatCurrency(srv.price)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Escolha o Profissional */}
        {step === 2 && (
          <div className="rounded-2xl border border-[#22262E] bg-[#14171C] p-6 shadow-2xl space-y-4">
            <div>
              <h2 className="text-base font-bold text-white">Escolha o Barbeiro</h2>
              <p className="text-xs text-zinc-400">
                Selecione o profissional de sua preferência ou o primeiro disponível
              </p>
            </div>

            <div className="space-y-2.5">
              {/* Option: Qualquer Barbeiro */}
              <div
                onClick={() => {
                  setSelectedBarber(null);
                  setStep(3);
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  selectedBarber === null
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-[#22262E] bg-[#0D0F12] hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-zinc-800 text-amber-400 flex items-center justify-center font-bold text-sm">
                    ✨
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-xs">
                      Qualquer Profissional Disponível
                    </h3>
                    <p className="text-[11px] text-zinc-400">Maior disponibilidade de horários</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-zinc-500" />
              </div>

              {/* Specific Barbers */}
              {shop.barbers.map((barber: any) => (
                <div
                  key={barber.id}
                  onClick={() => {
                    setSelectedBarber(barber);
                    setStep(3);
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    selectedBarber?.id === barber.id
                      ? 'border-amber-500 bg-amber-500/10'
                      : 'border-[#22262E] bg-[#0D0F12] hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-zinc-800 border border-zinc-700 text-amber-400 flex items-center justify-center font-bold text-sm">
                      {barber.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-xs">{barber.name}</h3>
                      <p className="text-[11px] text-zinc-400">{barber.specialty || 'Barbeiro'}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-zinc-500" />
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-[#22262E]">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Serviços
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Escolha a Data e Horário */}
        {step === 3 && (
          <div className="rounded-2xl border border-[#22262E] bg-[#14171C] p-6 shadow-2xl space-y-4">
            <div>
              <h2 className="text-base font-bold text-white">Escolha a Data & Horário</h2>
              <p className="text-xs text-zinc-400">
                {selectedService?.name} •{' '}
                {selectedBarber ? selectedBarber.name : 'Qualquer Profissional'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                Data do Atendimento
              </label>
              <input
                type="date"
                value={selectedDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedTime('');
                }}
                className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                Horários Livres
              </label>

              {loadingSlots ? (
                <div className="py-6 text-center text-xs text-zinc-500">
                  Consultando disponibilidade...
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-500">
                  Nenhum horário disponível para esta data. Escolha outro dia.
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedTime(slot)}
                      className={`py-2 rounded-lg text-xs font-bold transition-all ${
                        selectedTime === slot
                          ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                          : 'bg-[#0D0F12] border border-[#22262E] text-zinc-300 hover:border-amber-500/50 hover:text-white'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#22262E] flex justify-between items-center">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar
              </button>

              <button
                disabled={!selectedTime}
                onClick={() => setStep(4)}
                className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 transition-all disabled:opacity-50"
              >
                <span>Avançar para Seus Dados</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Seus Dados (Sem Login Obrigatório!) */}
        {step === 4 && (
          <form
            onSubmit={handleConfirmBooking}
            className="rounded-2xl border border-[#22262E] bg-[#14171C] p-6 shadow-2xl space-y-4"
          >
            <div>
              <h2 className="text-base font-bold text-white">Quase Pronto! Informe seus Dados</h2>
              <p className="text-xs text-zinc-400">
                Não precisa criar conta. Apenas seu nome e WhatsApp para confirmar.
              </p>
            </div>

            {/* Booking Summary Box */}
            <div className="p-3 rounded-xl bg-[#0D0F12] border border-[#22262E] text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-zinc-400">Serviço:</span>
                <span className="font-bold text-white">{selectedService?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Data e Hora:</span>
                <span className="font-bold text-amber-400">
                  {selectedDate} às {selectedTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Profissional:</span>
                <span className="text-zinc-200">
                  {selectedBarber ? selectedBarber.name : 'Primeiro Disponível'}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-zinc-800">
                <span className="text-zinc-400">Valor:</span>
                <span className="font-extrabold text-emerald-400 text-sm">
                  {formatCurrency(selectedService?.price)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                Seu Nome Completo *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Gabriel Alves"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                WhatsApp / Celular *
              </label>
              <input
                type="text"
                required
                placeholder="(11) 98765-4321"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                Observação (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Prefiro máquina 2"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="pt-3 border-t border-[#22262E] flex justify-between items-center">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 text-xs font-bold text-black shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{submitting ? 'Confirmando...' : 'Confirmar Agendamento'}</span>
              </button>
            </div>
          </form>
        )}

        {/* STEP 5: Sucesso & Confirmação */}
        {step === 5 && bookedResult && (
          <div className="rounded-2xl border border-emerald-500/30 bg-[#14171C] p-6 sm:p-8 shadow-2xl text-center space-y-4">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">Agendamento Confirmado!</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Seu horário está reservado na {shop.name}.
              </p>
            </div>

            <div className="rounded-xl bg-[#0D0F12] border border-[#22262E] p-4 text-xs space-y-2 text-left max-w-sm mx-auto">
              <div className="flex justify-between">
                <span className="text-zinc-400">Cliente:</span>
                <span className="font-bold text-white">{customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Serviço:</span>
                <span className="font-bold text-white">{selectedService?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Data e Horário:</span>
                <span className="font-bold text-amber-400">
                  {selectedDate} às {selectedTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Barbeiro:</span>
                <span className="text-zinc-300">{bookedResult.appointment?.barberName}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-zinc-800">
                <span className="text-zinc-400">Valor:</span>
                <span className="font-extrabold text-emerald-400">
                  {formatCurrency(selectedService?.price)}
                </span>
              </div>
            </div>

            <div className="pt-2 space-y-2 max-w-sm mx-auto">
              <a
                href={`/agendamento/${bookedResult.publicToken}`}
                className="block w-full py-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-xs font-bold text-white hover:bg-zinc-700 transition-colors"
              >
                Gerenciar meu Agendamento / Cancelar
              </a>

              <button
                onClick={() => {
                  setStep(1);
                  setSelectedService(null);
                  setSelectedTime('');
                  setBookedResult(null);
                }}
                className="text-xs text-zinc-500 hover:text-zinc-300"
              >
                Agendar outro horário
              </button>
            </div>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      <Modal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        title="QR Code do Balcão"
        subtitle="Coloque no balcão da sua barbearia para os clientes agendarem direto do celular"
      >
        <div className="py-4 text-center space-y-4">
          <div className="p-4 rounded-xl bg-white text-black inline-block shadow-xl">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                typeof window !== 'undefined' ? window.location.href : ''
              )}`}
              alt="QR Code de Agendamento"
              className="w-48 h-48 mx-auto"
            />
          </div>
          <p className="text-xs text-zinc-400 font-mono">
            {typeof window !== 'undefined' ? window.location.href : ''}
          </p>
          <div className="flex justify-end pt-2 border-t border-[#22262E]">
            <button
              onClick={() => setIsQrModalOpen(false)}
              className="rounded-lg bg-zinc-800 px-4 py-1.5 text-xs text-white hover:bg-zinc-700"
            >
              Fechar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
