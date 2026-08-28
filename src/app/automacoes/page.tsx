'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/AppShell';
import { Modal } from '@/components/UI/Modal';
import {
  Zap,
  Plus,
  Send,
  CheckCircle2,
  XCircle,
  Key,
  Globe,
  Radio,
  Clock,
  Sparkles,
  Copy,
  ExternalLink,
  Code,
  ShieldCheck,
  AlertCircle,
  MessageSquare,
  Bell,
  Smartphone,
  Calendar,
  Check,
} from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';

export default function AutomacoesPage() {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'webhooks'>('whatsapp');

  // Webhooks State
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<any | null>(null);
  const [form, setForm] = useState({
    url: '',
    secret: '',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any | null>(null);

  // WhatsApp & Reminders Settings State
  const [whatsappSettings, setWhatsappSettings] = useState({
    whatsappActive: true,
    reminder24h: true,
    reminder6h: true,
    reminder2h: true,
    reminder1h: true,
    whatsappApiKey: '',
    whatsappPhoneId: '',
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // WhatsApp Chat Simulator State
  const [simPhone, setSimPhone] = useState('14998016163');
  const [simInput, setSimInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'bot'; text: string; time: string }>>([
    {
      sender: 'bot',
      text: 'Olá! 👋 Sou o assistente virtual da barbearia.\n\nComo posso te ajudar hoje?\n\n1️⃣ Agendar horário\n2️⃣ Ver meu próximo horário\n3️⃣ Cancelar agendamento\n4️⃣ Remarcar horário\n5️⃣ Falar com a barbearia',
      time: 'Agora',
    },
  ]);
  const [simLoading, setSimLoading] = useState(false);

  const fetchWebhooks = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/webhooks');
      const data = await res.json();
      if (res.ok) {
        setWebhooks(data.webhooks || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/automacoes/settings');
      const data = await res.json();
      if (res.ok && data.settings) {
        setWhatsappSettings({
          whatsappActive: data.settings.whatsappActive ?? true,
          reminder24h: data.settings.reminder24h ?? true,
          reminder6h: data.settings.reminder6h ?? true,
          reminder2h: data.settings.reminder2h ?? true,
          reminder1h: data.settings.reminder1h ?? true,
          whatsappApiKey: data.settings.whatsappApiKey || '',
          whatsappPhoneId: data.settings.whatsappPhoneId || '',
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  useEffect(() => {
    fetchWebhooks();
    fetchSettings();
  }, []);

  const openNewModal = () => {
    setEditingWebhook(null);
    setForm({
      url: 'https://n8n.srv1194775.hstgr.cloud/webhook/barberflow-events',
      secret: `whsec_${Math.random().toString(36).substring(2, 15)}`,
      isActive: true,
    });
    setError('');
    setIsModalOpen(true);
  };

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const url = editingWebhook ? `/api/webhooks/${editingWebhook.id}` : '/api/webhooks';
      const method = editingWebhook ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar webhook');

      setIsModalOpen(false);
      fetchWebhooks();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSettingsSuccess(false);
    try {
      const res = await fetch('/api/automacoes/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(whatsappSettings),
      });
      if (res.ok) {
        setSettingsSuccess(true);
        setTimeout(() => setSettingsSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTestConnection = async (webhook: any) => {
    setTestingId(webhook.id);
    setTestResult(null);

    try {
      const res = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhook.url, secret: webhook.secret }),
      });

      const data = await res.json();
      setTestResult({
        success: data.success,
        message: data.message,
        status: data.status,
        latencyMs: data.latencyMs,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Falha ao testar conexão: ${err.message}`,
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleSendSimMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simInput.trim() || simLoading) return;

    const userText = simInput.trim();
    setSimInput('');
    setChatMessages((prev) => [...prev, { sender: 'user', text: userText, time: 'Agora' }]);
    setSimLoading(true);

    try {
      const res = await fetch('/api/webhooks/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: simPhone,
          text: userText,
          tenantSlug: 'barbearia-imperial',
        }),
      });

      const data = await res.json();
      if (data.result?.reply) {
        setChatMessages((prev) => [
          ...prev,
          { sender: 'bot', text: data.result.reply, time: 'Agora' },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          { sender: 'bot', text: 'Mensagem processada com sucesso.', time: 'Agora' },
        ]);
      }
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { sender: 'bot', text: `Erro: ${err.message}`, time: 'Agora' },
      ]);
    } finally {
      setSimLoading(false);
    }
  };

  const supportedEvents = [
    { name: 'APPOINTMENT_CREATED', desc: 'Novo agendamento criado (WhatsApp ou Web)' },
    { name: 'APPOINTMENT_CONFIRMED', desc: 'Agendamento confirmado pelo cliente' },
    { name: 'APPOINTMENT_COMPLETED', desc: 'Atendimento concluído e pagamento registrado' },
    { name: 'APPOINTMENT_CANCELLED', desc: 'Agendamento cancelado com motivo' },
    { name: 'APPOINTMENT_NO_SHOW', desc: 'Cliente não compareceu ao horário agendado' },
    { name: 'CUSTOMER_CREATED', desc: 'Novo cliente cadastrado na base' },
    { name: 'CUSTOMER_AT_RISK', desc: 'Cliente entrou em risco (passou do ciclo habitual)' },
    { name: 'CUSTOMER_INACTIVE', desc: 'Cliente ficou inativo (2x o ciclo sem voltar)' },
    { name: 'CUSTOMER_DUE_FOR_RETURN', desc: 'Cliente está próximo da data de retorno' },
  ];

  return (
    <AppShell
      title="Automações & WhatsApp Engine"
      subtitle="Atendimento conversacional, lembretes anti-duplicação e integração n8n"
      actions={
        activeTab === 'webhooks' ? (
          <button
            onClick={openNewModal}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-bold text-black shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Configurar Webhook n8n</span>
          </button>
        ) : (
          <button
            onClick={handleSaveSettings}
            disabled={savingSettings}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-xs font-bold text-black shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-emerald-500 transition-all"
          >
            {settingsSuccess ? <Check className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
            <span>{savingSettings ? 'Salvando...' : settingsSuccess ? 'Salvo!' : 'Salvar Preferências'}</span>
          </button>
        )
      }
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-[#22262E] gap-6 text-xs font-bold">
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-2 pb-3 transition-colors border-b-2 ${
              activeTab === 'whatsapp'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>WhatsApp Engine & Lembretes</span>
          </button>
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`flex items-center gap-2 pb-3 transition-colors border-b-2 ${
              activeTab === 'webhooks'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap className="h-4 w-4" />
            <span>Webhooks n8n & Eventos</span>
          </button>
        </div>

        {/* ================= TAB 1: WHATSAPP ENGINE ================= */}
        {activeTab === 'whatsapp' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Settings Column */}
            <div className="lg:col-span-7 space-y-6">
              {/* Reminder Rules Card */}
              <div className="rounded-xl border border-[#22262E] bg-[#14171C] p-5 shadow-xl space-y-5">
                <div className="flex items-center justify-between border-b border-[#22262E] pb-3">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <Bell className="h-4 w-4 text-amber-400" />
                    <span>Lembretes Automáticos Anti-Duplicação</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Persistente no Banco
                  </span>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">
                  Lembretes programados de forma resiliente e com chave de idempotência exclusiva. Nenhum cliente recebe notificações duplicadas.
                </p>

                <div className="space-y-3">
                  {/* T-24h */}
                  <label className="flex items-center justify-between p-3 rounded-lg bg-[#0D0F12] border border-[#22262E] cursor-pointer hover:border-zinc-700 transition-colors">
                    <div>
                      <span className="font-bold text-xs text-white block">🔔 Lembrete 24 Horas Antes (T-24h)</span>
                      <span className="text-[11px] text-zinc-400">Envia resumo do agendamento e link para o calendário do dia seguinte</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={whatsappSettings.reminder24h}
                      onChange={(e) => setWhatsappSettings({ ...whatsappSettings, reminder24h: e.target.checked })}
                      className="h-4 w-4 rounded accent-amber-500"
                    />
                  </label>

                  {/* T-6h */}
                  <label className="flex items-center justify-between p-3 rounded-lg bg-[#0D0F12] border border-[#22262E] cursor-pointer hover:border-zinc-700 transition-colors">
                    <div>
                      <span className="font-bold text-xs text-white block">⏰ Lembrete 6 Horas Antes (T-6h)</span>
                      <span className="text-[11px] text-zinc-400">Aviso matinal/vespertino no mesmo dia do atendimento</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={whatsappSettings.reminder6h}
                      onChange={(e) => setWhatsappSettings({ ...whatsappSettings, reminder6h: e.target.checked })}
                      className="h-4 w-4 rounded accent-amber-500"
                    />
                  </label>

                  {/* T-2h */}
                  <label className="flex items-center justify-between p-3 rounded-lg bg-[#0D0F12] border border-[#22262E] cursor-pointer hover:border-zinc-700 transition-colors">
                    <div>
                      <span className="font-bold text-xs text-white block">✂️ Lembrete 2 Horas Antes (T-2h)</span>
                      <span className="text-[11px] text-zinc-400">Notificação rápida para o cliente se preparar para o deslocamento</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={whatsappSettings.reminder2h}
                      onChange={(e) => setWhatsappSettings({ ...whatsappSettings, reminder2h: e.target.checked })}
                      className="h-4 w-4 rounded accent-amber-500"
                    />
                  </label>

                  {/* T-1h */}
                  <label className="flex items-center justify-between p-3 rounded-lg bg-[#0D0F12] border border-[#22262E] cursor-pointer hover:border-zinc-700 transition-colors">
                    <div>
                      <span className="font-bold text-xs text-white block">⚡ Lembrete 1 Hora Antes (T-1h)</span>
                      <span className="text-[11px] text-zinc-400">Último aviso de comparecimento antes do início do corte</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={whatsappSettings.reminder1h}
                      onChange={(e) => setWhatsappSettings({ ...whatsappSettings, reminder1h: e.target.checked })}
                      className="h-4 w-4 rounded accent-amber-500"
                    />
                  </label>
                </div>
              </div>

              {/* WAHA Engine & Session Manager */}
              <div className="rounded-xl border border-[#22262E] bg-[#14171C] p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-[#22262E] pb-3">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <Smartphone className="h-4 w-4 text-emerald-400" />
                    <span>Servidor WAHA (Transporte WhatsApp Oficial)</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    https://evo.projetosunion.cloud
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-[#0D0F12] border border-[#22262E] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-zinc-500">Status da Sessão</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-bold text-emerald-400">Pronto para Conectar</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0D0F12] border border-[#22262E] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-zinc-500">Instância WAHA</span>
                    <span className="font-mono font-bold text-white block">session: default</span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0D0F12] border border-[#22262E] space-y-1">
                    <span className="text-[10px] uppercase font-bold text-zinc-500">Webhook n8n</span>
                    <span className="font-mono font-bold text-amber-400 block">/barberflow-waha-inbound</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-zinc-300">Webhook Configurado no WAHA:</span>
                    <span className="text-[10px] text-emerald-400 font-mono">HMAC + Replay Protection</span>
                  </div>
                  <code className="text-amber-400 break-all font-mono block bg-black/40 p-2 rounded border border-zinc-800">
                    https://n8n.srv1194775.hstgr.cloud/webhook/barberflow-waha-inbound
                  </code>
                </div>
              </div>
                  <span className="font-bold text-zinc-300 block">Endpoint de Webhook do WhatsApp:</span>
                  <code className="text-amber-400 break-all font-mono">
                    https://barber.projetosunion.cloud/api/webhooks/whatsapp
                  </code>
                </div>
              </div>
            </div>

            {/* Live Chat Simulator Column */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-[#22262E] bg-[#14171C] p-4 shadow-2xl flex flex-col h-[560px]">
                {/* Simulator Header */}
                <div className="flex items-center justify-between border-b border-[#22262E] pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-white">Simulador Conversacional WhatsApp</span>
                  </div>
                  <input
                    type="text"
                    value={simPhone}
                    onChange={(e) => setSimPhone(e.target.value)}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-300 w-28 text-right"
                    title="Telefone do cliente"
                  />
                </div>

                {/* Message Log Box */}
                <div className="flex-1 overflow-y-auto space-y-3 p-2 text-xs">
                  {chatMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-md whitespace-pre-wrap leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-amber-500 text-black font-medium rounded-tr-none'
                            : 'bg-[#22262E] text-zinc-100 rounded-tl-none border border-zinc-700'
                        }`}
                      >
                        {msg.text}
                      </div>
                      <span className="text-[9px] text-zinc-500 mt-1 px-1">{msg.time}</span>
                    </div>
                  ))}
                  {simLoading && (
                    <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] italic p-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce" />
                      <span>Assistente digitando...</span>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <form onSubmit={handleSendSimMessage} className="pt-3 border-t border-[#22262E] flex gap-2">
                  <input
                    type="text"
                    placeholder="Digite ex: Oi, 1, Quero cortar amanhã..."
                    value={simInput}
                    onChange={(e) => setSimInput(e.target.value)}
                    className="flex-1 rounded-xl border border-[#22262E] bg-[#0D0F12] px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={simLoading || !simInput.trim()}
                    className="rounded-xl bg-amber-500 hover:bg-amber-400 text-black px-3.5 py-2 font-bold transition-all disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: WEBHOOKS N8N ================= */}
        {activeTab === 'webhooks' && (
          <div className="space-y-6">
            {/* Banner Info */}
            <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-[#1A1D23] to-[#121418] p-5 shadow-xl space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Zap className="h-4 w-4" />
                <span>Central de Notificações & Automações n8n</span>
              </div>
              <p className="text-xs text-zinc-300 max-w-2xl leading-relaxed">
                O BarberFlow envia eventos em tempo real com assinatura criptográfica <strong>HMAC-SHA256</strong> diretamente para seu webhook do n8n.
              </p>
            </div>

            {/* Webhook Test Alert Result */}
            {testResult && (
              <div
                className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs shadow-lg ${
                  testResult.success
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                    : 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {testResult.success ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold block">
                      {testResult.success ? 'Teste de Webhook Aprovado!' : 'Falha no Teste de Conexão'}
                    </span>
                    <span>{testResult.message}</span>
                  </div>
                </div>
                <button
                  onClick={() => setTestResult(null)}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  Fechar
                </button>
              </div>
            )}

            {/* Webhooks Configured */}
            <div className="rounded-xl border border-[#22262E] bg-[#14171C] p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#22262E] pb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Webhooks Cadastrados ({webhooks.length})
                </span>
                <span className="text-xs text-zinc-500">Formato: JSON + Header X-BarberFlow-Signature</span>
              </div>

              {loading ? (
                <div className="py-8 text-center text-xs text-zinc-500">Carregando automações...</div>
              ) : webhooks.length === 0 ? (
                <div className="py-8 text-center text-xs text-zinc-500">
                  Nenhum webhook cadastrado. Clique em &quot;Configurar Webhook n8n&quot; acima para conectar seu fluxo.
                </div>
              ) : (
                <div className="space-y-3">
                  {webhooks.map((w) => (
                    <div
                      key={w.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-lg bg-[#0D0F12] border border-[#22262E]"
                    >
                      <div className="space-y-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-amber-400 shrink-0" />
                          <span className="text-xs font-mono font-bold text-white truncate max-w-md">
                            {w.url}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                              w.isActive
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-zinc-800 text-zinc-500'
                            }`}
                          >
                            {w.isActive ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-zinc-400 font-mono">
                          <span className="flex items-center gap-1">
                            <Key className="h-3 w-3 text-zinc-500" />
                            Secret: {w.secret ? '••••••••' + w.secret.slice(-4) : 'whsec_***'}
                          </span>
                          {w.lastTriggerAt && (
                            <span>Último disparo: {formatDate(w.lastTriggerAt)} às {formatTime(w.lastTriggerAt)}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleTestConnection(w)}
                          disabled={testingId === w.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-all disabled:opacity-50"
                        >
                          <Send className="h-3 w-3" />
                          <span>{testingId === w.id ? 'Testando...' : 'Testar Disparo'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available Events Catalog */}
            <div className="rounded-xl border border-[#22262E] bg-[#14171C] p-5 shadow-xl space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Catálogo de Eventos Suportados no n8n
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {supportedEvents.map((evt) => (
                  <div key={evt.name} className="p-3 rounded-lg bg-[#0D0F12] border border-[#22262E] space-y-1">
                    <span className="font-mono font-bold text-amber-400 block">{evt.name}</span>
                    <p className="text-[11px] text-zinc-400 leading-snug">{evt.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal New / Edit Webhook */}
        {isModalOpen && (
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={editingWebhook ? 'Editar Webhook n8n' : 'Configurar Novo Webhook n8n'}
          >
            <form onSubmit={handleSaveWebhook} className="space-y-4 text-xs">
              {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-zinc-400 mb-1">URL do Webhook (n8n ou Gateway):</label>
                <input
                  type="url"
                  required
                  placeholder="https://n8n.seu-dominio.com/webhook/barberflow-events"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  className="w-full rounded-lg border border-[#22262E] bg-[#0D0F12] px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Secret de Assinatura (HMAC SHA-256):</label>
                <input
                  type="text"
                  required
                  value={form.secret}
                  onChange={(e) => setForm({ ...form, secret: e.target.value })}
                  className="w-full rounded-lg border border-[#22262E] bg-[#0D0F12] px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-amber-500"
                />
                <label htmlFor="isActive" className="text-zinc-300">
                  Webhook Ativo (Disparar eventos automaticamente)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#22262E]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-zinc-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-amber-500 font-bold text-black hover:bg-amber-400 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar Webhook'}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </AppShell>
  );
}
