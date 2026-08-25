'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/AppShell';
import {
  Clock,
  CheckCircle2,
  Save,
  Building,
  Phone,
  MapPin,
  ExternalLink,
  Copy,
  MessageSquare,
  Sparkles,
  QrCode,
} from 'lucide-react';
import { Modal } from '@/components/UI/Modal';

const dayNames = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export default function ConfiguracoesPage() {
  const [shop, setShop] = useState<any | null>(null);
  const [shopForm, setShopForm] = useState({
    name: '',
    phone: '',
    address: '',
    city: '',
  });
  const [hours, setHours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [savingShop, setSavingShop] = useState(false);
  const [savingHours, setSavingHours] = useState(false);
  const [successShop, setSuccessShop] = useState(false);
  const [successHours, setSuccessHours] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [shopRes, hoursRes] = await Promise.all([
        fetch('/api/barbershop'),
        fetch('/api/business-hours'),
      ]);

      const [shopData, hoursData] = await Promise.all([shopRes.json(), hoursRes.json()]);

      if (shopRes.ok && shopData.shop) {
        setShop(shopData.shop);
        setShopForm({
          name: shopData.shop.name || '',
          phone: shopData.shop.phone || '',
          address: shopData.shop.address || '',
          city: shopData.shop.city || '',
        });
      }

      if (hoursRes.ok && hoursData.hours) {
        const allDays = [];
        for (let i = 0; i < 7; i++) {
          const found = hoursData.hours.find((h: any) => h.dayOfWeek === i);
          if (found) {
            allDays.push(found);
          } else {
            allDays.push({
              dayOfWeek: i,
              openTime: '09:00',
              closeTime: '19:00',
              isOpen: i !== 0,
            });
          }
        }
        setHours(allDays);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingShop(true);
    try {
      const res = await fetch('/api/barbershop', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shopForm),
      });
      if (res.ok) {
        setSuccessShop(true);
        setTimeout(() => setSuccessShop(false), 3000);
      }
    } finally {
      setSavingShop(false);
    }
  };

  const handleHourChange = (dayOfWeek: number, field: string, value: any) => {
    const updated = hours.map((h) => {
      if (h.dayOfWeek === dayOfWeek) {
        return { ...h, [field]: value };
      }
      return h;
    });
    setHours(updated);
  };

  const handleSaveHours = async () => {
    setSavingHours(true);
    try {
      const res = await fetch('/api/business-hours', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours }),
      });
      if (res.ok) {
        setSuccessHours(true);
        setTimeout(() => setSuccessHours(false), 3000);
      }
    } finally {
      setSavingHours(false);
    }
  };

  const publicUrl =
    typeof window !== 'undefined' && shop?.slug
      ? `${window.location.origin}/b/${shop.slug}`
      : `/b/${shop?.slug || ''}`;

  const copyPublicLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <AppShell
      title="Configurações da Barbearia"
      subtitle="Dados da empresa, link público de agendamento e horários de funcionamento"
    >
      <div className="space-y-6 max-w-4xl">
        {/* PUBLIC LINK BANNER */}
        {shop?.slug && (
          <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-[#1A1D23] to-[#121418] p-5 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                Link Público de Autoatendimento
              </span>
              <p className="text-xs font-mono font-bold text-white truncate max-w-md">
                {publicUrl}
              </p>
              <p className="text-[11px] text-zinc-400">
                Compartilhe na bio do Instagram, WhatsApp ou imprima o QR Code no balcão.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={copyPublicLink}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-200 hover:text-white hover:bg-zinc-700 transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
              </button>

              <button
                onClick={() => setIsQrOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-200 hover:text-white hover:bg-zinc-700 transition-colors"
              >
                <QrCode className="h-3.5 w-3.5" />
                <span>QR Code</span>
              </button>

              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-2 text-xs font-bold text-black hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Abrir</span>
              </a>
            </div>
          </div>
        )}

        {/* SECTION 1: DADOS DA BARBEARIA */}
        <form
          onSubmit={handleSaveShop}
          className="rounded-xl border border-[#22262E] bg-[#14171C] p-6 shadow-xl space-y-4"
        >
          <div className="flex items-center justify-between border-b border-[#22262E] pb-3">
            <div className="flex items-center gap-2.5">
              <Building className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-bold text-white">Dados do Estabelecimento</h2>
            </div>
            <button
              type="submit"
              disabled={savingShop}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-black hover:bg-amber-400 transition-all disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{savingShop ? 'Salvando...' : 'Salvar Dados'}</span>
            </button>
          </div>

          {successShop && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Dados da barbearia atualizados!</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                Nome da Barbearia *
              </label>
              <input
                type="text"
                required
                value={shopForm.name}
                onChange={(e) => setShopForm({ ...shopForm, name: e.target.value })}
                className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                WhatsApp / Telefone de Contato
              </label>
              <input
                type="text"
                value={shopForm.phone}
                onChange={(e) => setShopForm({ ...shopForm, phone: e.target.value })}
                className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                Endereço
              </label>
              <input
                type="text"
                value={shopForm.address}
                onChange={(e) => setShopForm({ ...shopForm, address: e.target.value })}
                className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                Cidade / Estado
              </label>
              <input
                type="text"
                value={shopForm.city}
                onChange={(e) => setShopForm({ ...shopForm, city: e.target.value })}
                className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>
        </form>

        {/* SECTION 2: HORÁRIOS DE FUNCIONAMENTO */}
        <div className="rounded-xl border border-[#22262E] bg-[#14171C] p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#22262E] pb-3">
            <div className="flex items-center gap-2.5">
              <Clock className="h-4 w-4 text-amber-400" />
              <div>
                <h2 className="text-sm font-bold text-white">Horários de Funcionamento</h2>
                <p className="text-xs text-zinc-400">
                  Bloqueia agendamentos fora do expediente ou em dias fechados
                </p>
              </div>
            </div>

            <button
              onClick={handleSaveHours}
              disabled={savingHours || loading}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-black hover:bg-amber-400 transition-all disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{savingHours ? 'Salvando...' : 'Salvar Horários'}</span>
            </button>
          </div>

          {successHours && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Horários de funcionamento atualizados com sucesso!</span>
            </div>
          )}

          <div className="space-y-2.5">
            {hours.map((h) => (
              <div
                key={h.dayOfWeek}
                className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg border transition-all ${
                  h.isOpen
                    ? 'bg-[#0D0F12] border-[#22262E]'
                    : 'bg-zinc-900/40 border-zinc-800/60 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 w-40">
                  <input
                    type="checkbox"
                    id={`day-${h.dayOfWeek}`}
                    checked={h.isOpen}
                    onChange={(e) => handleHourChange(h.dayOfWeek, 'isOpen', e.target.checked)}
                    className="rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-amber-500"
                  />
                  <label
                    htmlFor={`day-${h.dayOfWeek}`}
                    className="text-xs font-semibold text-white cursor-pointer"
                  >
                    {dayNames[h.dayOfWeek]}
                  </label>
                </div>

                {h.isOpen ? (
                  <div className="flex items-center gap-3 mt-2 sm:mt-0 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-500">Abre:</span>
                      <input
                        type="time"
                        value={h.openTime}
                        onChange={(e) =>
                          handleHourChange(h.dayOfWeek, 'openTime', e.target.value)
                        }
                        className="rounded border border-[#2A2E35] bg-zinc-900 px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <span className="text-zinc-600">às</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-zinc-500">Fecha:</span>
                      <input
                        type="time"
                        value={h.closeTime}
                        onChange={(e) =>
                          handleHourChange(h.dayOfWeek, 'closeTime', e.target.value)
                        }
                        className="rounded border border-[#2A2E35] bg-zinc-900 px-2 py-1 text-xs text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                ) : (
                  <span className="text-xs font-medium text-rose-400 mt-2 sm:mt-0">
                    Fechado o dia todo
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      <Modal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        title="QR Code do Balcão da Barbearia"
        subtitle="Imprima e coloque no balcão ou nas bancadas para seus clientes agendarem pelo celular"
      >
        <div className="py-4 text-center space-y-4">
          <div className="p-4 rounded-xl bg-white text-black inline-block shadow-xl">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                publicUrl
              )}`}
              alt="QR Code de Agendamento"
              className="w-52 h-52 mx-auto"
            />
          </div>
          <p className="text-xs text-zinc-400 font-mono">{publicUrl}</p>
          <div className="flex justify-end pt-2 border-t border-[#22262E]">
            <button
              onClick={() => setIsQrOpen(false)}
              className="rounded-lg bg-zinc-800 px-4 py-1.5 text-xs text-white hover:bg-zinc-700"
            >
              Fechar
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
