'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Scissors,
  Calendar,
  Clock,
  MapPin,
  Phone,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Share2,
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Badge } from '@/components/UI/Badge';

export default function AppointmentPublicStatusPage() {
  const params = useParams();
  const token = params.token as string;

  const [appointment, setAppointment] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const fetchAppointment = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/public/appointment/${token}`);
      const data = await res.json();
      if (res.ok) {
        setAppointment(data.appointment);
      } else {
        setError(data.error || 'Agendamento não encontrado');
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar agendamento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchAppointment();
  }, [token]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch(`/api/public/appointment/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CANCEL',
          cancelReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao cancelar');

      setShowCancelConfirm(false);
      fetchAppointment();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0D0F12] text-zinc-400 text-xs">
        Carregando detalhes do agendamento...
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0D0F12] p-6 text-center text-zinc-300">
        <AlertTriangle className="h-10 w-10 text-amber-500 mb-3" />
        <h1 className="text-lg font-bold text-white">Agendamento não encontrado</h1>
        <p className="text-xs text-zinc-500 mt-1">{error || 'Verifique o link informado.'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0F12] text-zinc-100 flex flex-col items-center py-8 px-4 sm:px-6">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-black shadow-lg shadow-amber-500/20">
            <Scissors className="h-6 w-6" />
          </div>
          <h1 className="mt-3 text-xl font-bold text-white">{appointment.barbershop?.name}</h1>
          <p className="text-xs text-zinc-400">Detalhes e Gestão do Agendamento</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[#22262E] bg-[#14171C] p-6 shadow-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-[#22262E] pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Status do Horário
            </span>
            <Badge status={appointment.status} size="md" />
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-400">Cliente:</span>
              <span className="font-bold text-white">{appointment.customer?.name}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-zinc-400">Serviço:</span>
              <span className="font-semibold text-white">{appointment.service?.name}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-zinc-400">Data e Hora:</span>
              <span className="font-bold text-amber-400">
                {formatDateTime(appointment.scheduledAt)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-zinc-400">Barbeiro:</span>
              <span className="text-zinc-200">{appointment.barber?.name}</span>
            </div>

            <div className="flex justify-between pt-2 border-t border-[#22262E]">
              <span className="text-zinc-400">Valor:</span>
              <span className="font-extrabold text-emerald-400 text-sm">
                {formatCurrency(appointment.price)}
              </span>
            </div>
          </div>

          {/* Calendar Integration Buttons */}
          {appointment.status !== 'CANCELADO' && (
            <div className="space-y-2 pt-2 border-t border-[#22262E]">
              <span className="text-[11px] font-bold text-zinc-400 block mb-1">
                📅 Adicionar à sua Agenda:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <a
                  href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
                    `${appointment.service?.name || 'Corte'} - ${appointment.barbershop?.name}`
                  )}&dates=${new Date(appointment.scheduledAt)
                    .toISOString()
                    .replace(/[-:]/g, '')
                    .replace(/\.\d{3}/, '')}/${new Date(appointment.endAt || new Date(new Date(appointment.scheduledAt).getTime() + 60*60*1000))
                    .toISOString()
                    .replace(/[-:]/g, '')
                    .replace(/\.\d{3}/, '')}&details=${encodeURIComponent(
                    `✂️ Serviço: ${appointment.service?.name}\n👤 Barbeiro: ${appointment.barber?.name}\n💰 Valor: R$ ${appointment.price.toFixed(2)}\n📍 ${appointment.barbershop?.name}`
                  )}&location=${encodeURIComponent(appointment.barbershop?.address || appointment.barbershop?.name || '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 hover:text-white border border-zinc-700 transition-colors shadow-sm"
                >
                  <Calendar className="h-3.5 w-3.5 text-amber-400" />
                  <span>Google Calendar</span>
                </a>

                <a
                  href={`/api/calendar/appointment/${token}.ics`}
                  download={`agendamento-${token.slice(0, 8)}.ics`}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 hover:text-white border border-zinc-700 transition-colors shadow-sm"
                >
                  <Calendar className="h-3.5 w-3.5 text-blue-400" />
                  <span>Apple / Outlook (.ics)</span>
                </a>
              </div>
            </div>
          )}

          {appointment.cancelReason && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
              <span className="font-bold block">Motivo do Cancelamento:</span>
              <span>{appointment.cancelReason}</span>
            </div>
          )}

          {/* Cancellation Control */}
          {appointment.status !== 'CANCELADO' && appointment.status !== 'CONCLUIDO' && (
            <div className="pt-3 border-t border-[#22262E]">
              {showCancelConfirm ? (
                <div className="space-y-3 p-3 rounded-xl bg-[#0D0F12] border border-rose-500/40">
                  <h4 className="font-bold text-white text-xs">Confirmar Cancelamento</h4>
                  <input
                    type="text"
                    placeholder="Motivo (opcional)"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowCancelConfirm(false)}
                      className="px-3 py-1 text-xs text-zinc-400 hover:text-white"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleCancel}
                      disabled={cancelling}
                      className="rounded bg-rose-500 px-3 py-1 text-xs font-bold text-white hover:bg-rose-600"
                    >
                      {cancelling ? 'Cancelando...' : 'Confirmar Cancelamento'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="w-full py-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-xs font-bold text-rose-400 hover:bg-rose-500/20 transition-colors"
                >
                  Cancelar este Agendamento
                </button>
              )}
            </div>
          )}
        </div>

        {/* Shop Info Footer */}
        <div className="text-center text-xs text-zinc-500 space-y-1">
          <p>{appointment.barbershop?.address}</p>
          <p>{appointment.barbershop?.phone}</p>
        </div>
      </div>
    </div>
  );
}
