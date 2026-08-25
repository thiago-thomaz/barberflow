'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Scissors,
  Building2,
  Phone,
  MapPin,
  Clock,
  User,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Account & Name
    ownerName: '',
    email: '',
    password: '',
    barbershopName: '',

    // Step 2: Details
    phone: '',
    address: '',
    city: '',

    // Step 3: First Barber
    barberName: '',
    barberSpecialty: 'Cortes modernos, degradê e barba',

    // Step 4: Services
    services: [
      { name: 'Corte Tradicional', price: '40.00', durationMin: 30 },
      { name: 'Barboterapia', price: '30.00', durationMin: 30 },
      { name: 'Combo Corte + Barba', price: '65.00', durationMin: 60 },
    ],
  });

  const handleServiceChange = (index: number, field: string, value: string | number) => {
    const updated = [...formData.services];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, services: updated });
  };

  const addService = () => {
    setFormData({
      ...formData,
      services: [...formData.services, { name: '', price: '40.00', durationMin: 30 }],
    });
  };

  const removeService = (index: number) => {
    if (formData.services.length <= 1) return;
    setFormData({
      ...formData,
      services: formData.services.filter((_, i) => i !== index),
    });
  };

  const handleFinish = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.ownerName,
          email: formData.email,
          password: formData.password,
          barbershopName: formData.barbershopName,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          barberName: formData.barberName || formData.ownerName,
          barberSpecialty: formData.barberSpecialty,
          services: formData.services.map((s) => ({
            name: s.name,
            price: parseFloat(s.price) || 40,
            durationMin: Number(s.durationMin) || 30,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao concluir cadastro');
      }

      setStep(5); // Success step
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0D0F12] p-4 sm:p-6">
      <div className="w-full max-w-xl space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-black shadow-lg shadow-amber-500/20">
            <Scissors className="h-6 w-6" />
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Configurar BarberFlow
          </h1>
          <p className="mt-1 text-xs text-zinc-400">
            Em poucos minutos sua barbearia estará pronta para agendamentos
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between px-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  step === i
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30'
                    : step > i
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700/50'
                }`}
              >
                {step > i ? <CheckCircle2 className="h-4 w-4" /> : i}
              </div>
              {i < 5 && (
                <div
                  className={`h-0.5 w-8 sm:w-16 transition-colors ${
                    step > i ? 'bg-emerald-500/40' : 'bg-zinc-800'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Card Content */}
        <div className="rounded-2xl border border-[#22262E] bg-[#14171C] p-6 sm:p-8 shadow-2xl">
          {error && (
            <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              {error}
            </div>
          )}

          {/* STEP 1: Account & Shop Name */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="border-b border-[#22262E] pb-3 mb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-amber-400" />
                  Passo 1: Sua Barbearia e Conta
                </h2>
                <p className="text-xs text-zinc-400">Defina o nome da barbearia e seu acesso.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                  Nome da Barbearia *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Barbearia Imperial"
                  value={formData.barbershopName}
                  onChange={(e) => setFormData({ ...formData, barbershopName: e.target.value })}
                  className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                  Seu Nome Completo (Dono) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Silva"
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                    E-mail de Login *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="dono@barbearia.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                    Senha de Acesso *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Basic Contact & Location */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="border-b border-[#22262E] pb-3 mb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Phone className="h-4 w-4 text-amber-400" />
                  Passo 2: Contato & Localização
                </h2>
                <p className="text-xs text-zinc-400">Informações que aparecerão para seus clientes.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                  WhatsApp / Telefone da Barbearia
                </label>
                <input
                  type="text"
                  placeholder="(11) 99999-9999"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                    Endereço
                  </label>
                  <input
                    type="text"
                    placeholder="Av. Paulista, 1000"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    placeholder="São Paulo - SP"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: First Barber */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="border-b border-[#22262E] pb-3 mb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <User className="h-4 w-4 text-amber-400" />
                  Passo 3: Primeiro Barbeiro
                </h2>
                <p className="text-xs text-zinc-400">Cadastre você mesmo ou seu principal barbeiro.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                  Nome do Barbeiro *
                </label>
                <input
                  type="text"
                  placeholder={formData.ownerName || 'Ex: Carlos'}
                  value={formData.barberName}
                  onChange={(e) => setFormData({ ...formData, barberName: e.target.value })}
                  className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
                  Especialidade / Estilo
                </label>
                <input
                  type="text"
                  placeholder="Ex: Fade, degradê navalhado, barba com toalha quente"
                  value={formData.barberSpecialty}
                  onChange={(e) => setFormData({ ...formData, barberSpecialty: e.target.value })}
                  className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* STEP 4: Services */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="border-b border-[#22262E] pb-3 mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Scissors className="h-4 w-4 text-amber-400" />
                    Passo 4: Serviços Iniciais
                  </h2>
                  <p className="text-xs text-zinc-400">Defina os serviços, preços e durações.</p>
                </div>
                <button
                  type="button"
                  onClick={addService}
                  className="flex items-center gap-1 text-xs font-bold text-amber-400 hover:text-amber-300"
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar
                </button>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {formData.services.map((service, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-3 rounded-lg bg-[#0D0F12] border border-[#22262E]"
                  >
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Nome do serviço"
                        value={service.name}
                        onChange={(e) => handleServiceChange(idx, 'name', e.target.value)}
                        className="w-full bg-transparent text-sm text-white placeholder-zinc-600 focus:outline-none font-medium"
                      />
                    </div>
                    <div className="w-24">
                      <div className="flex items-center rounded bg-zinc-900 border border-zinc-800 px-2 py-1">
                        <span className="text-xs text-zinc-500 mr-1">R$</span>
                        <input
                          type="number"
                          value={service.price}
                          onChange={(e) => handleServiceChange(idx, 'price', e.target.value)}
                          className="w-full bg-transparent text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="w-20">
                      <div className="flex items-center rounded bg-zinc-900 border border-zinc-800 px-2 py-1">
                        <input
                          type="number"
                          value={service.durationMin}
                          onChange={(e) => handleServiceChange(idx, 'durationMin', e.target.value)}
                          className="w-full bg-transparent text-xs text-white focus:outline-none"
                        />
                        <span className="text-[10px] text-zinc-500 ml-1">min</span>
                      </div>
                    </div>
                    {formData.services.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeService(idx)}
                        className="text-zinc-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: Success Ready */}
          {step === 5 && (
            <div className="py-6 text-center space-y-4">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold text-white">Sua barbearia está pronta!</h2>
              <p className="text-sm text-zinc-300 max-w-sm mx-auto">
                Tudo pronto para receber agendamentos, calcular a recorrência dos clientes e alavancar seu faturamento.
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-sm font-bold text-black shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all"
              >
                <span>Acessar Meu Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Navigation Controls */}
          {step < 5 && (
            <div className="mt-6 flex items-center justify-between pt-4 border-t border-[#22262E]">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Voltar
                </button>
              ) : (
                <div />
              )}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (step === 1 && (!formData.barbershopName || !formData.ownerName || !formData.email || !formData.password)) {
                      setError('Preencha os campos obrigatórios');
                      return;
                    }
                    setError('');
                    setStep(step + 1);
                  }}
                  className="flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2.5 text-xs font-bold text-black hover:bg-amber-400 transition-colors"
                >
                  <span>Próximo</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={loading}
                  className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 text-xs font-bold text-black shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all disabled:opacity-50"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{loading ? 'Criando Barbearia...' : 'Concluir e Iniciar'}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-500">
          Já possui cadastro?{' '}
          <Link href="/login" className="font-semibold text-amber-400 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
