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
} from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils';

export default function AutomacoesPage() {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New/Edit Webhook Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<any | null>(null);
  const [form, setForm] = useState({
    url: '',
    secret: '',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Test Connection State
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any | null>(null);

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

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const openNewModal = () => {
    setEditingWebhook(null);
    setForm({
      url: 'https://seu-n8n.com/webhook/barberflow-imperial',
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

  const supportedEvents = [
    { name: 'APPOINTMENT_CREATED', desc: 'Novo agendamento criado (interno ou público)' },
    { name: 'APPOINTMENT_CONFIRMED', desc: 'Agendamento confirmado pelo cliente ou atendente' },
    { name: 'APPOINTMENT_COMPLETED', desc: 'Atendimento concluído e pagamento registrado' },
    { name: 'APPOINTMENT_CANCELLED', desc: 'Agendamento cancelado com motivo' },
    { name: 'APPOINTMENT_NO_SHOW', desc: 'Cliente não compareceu ao horário agendado' },
    { name: 'CUSTOMER_CREATED', desc: 'Novo cliente cadastrado na base da barbearia' },
    { name: 'CUSTOMER_AT_RISK', desc: 'Cliente entrou em risco (passou do ciclo habitual de corte)' },
    { name: 'CUSTOMER_INACTIVE', desc: 'Cliente ficou inativo (mais de 2x o ciclo habitual sem voltar)' },
    { name: 'CUSTOMER_DUE_FOR_RETURN', desc: 'Cliente está próximo da data habitual de retorno' },
  ];

  return (
    <AppShell
      title="Automações & Integração n8n"
      subtitle="Dispare mensagens no WhatsApp, lembretes e campanhas através de webhooks assinados"
      actions={
        <button
          onClick={openNewModal}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-bold text-black shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Configurar Webhook n8n</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* Banner Info */}
        <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-[#1A1D23] to-[#121418] p-5 shadow-xl space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <Zap className="h-4 w-4" />
            <span>Motor de Automação n8n</span>
          </div>
          <p className="text-xs text-zinc-300 max-w-2xl leading-relaxed">
            O BarberFlow envia eventos em tempo real com assinatura criptográfica <strong>HMAC-SHA256</strong> diretamente para seu webhook do n8n. Conecte com Evolution API, Z-API, WhatsApp Cloud API, envio de SMS e Google Reviews sem depender de ferramentas proprietárias caras.
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
            <div>
              <h3 className="font-bold text-white text-sm">Webhooks Registrados</h3>
              <p className="text-xs text-zinc-400">Endpoints configurados para esta barbearia</p>
            </div>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-zinc-500">Carregando webhooks...</div>
          ) : webhooks.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <Radio className="h-7 w-7 mx-auto text-zinc-600" />
              <p className="text-xs text-zinc-400">Nenhum webhook registrado ainda.</p>
              <button
                onClick={openNewModal}
                className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-bold hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar Webhook n8n
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {webhooks.map((wh) => (
                <div
                  key={wh.id}
                  className="p-4 rounded-xl bg-[#0D0F12] border border-[#22262E] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          wh.isActive ? 'bg-emerald-400' : 'bg-zinc-600'
                        }`}
                      />
                      <span className="font-mono text-xs font-bold text-white truncate max-w-md">
                        {wh.url}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
                      <span>
                        Chave HMAC: <code className="text-amber-400 font-mono">{wh.secret}</code>
                      </span>
                      {wh.lastTriggerAt && (
                        <span>
                          Último disparo: {formatDate(wh.lastTriggerAt)} às{' '}
                          {formatTime(wh.lastTriggerAt)} (HTTP {wh.lastStatus})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleTestConnection(wh)}
                      disabled={testingId === wh.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-all disabled:opacity-50"
                    >
                      <Send className={`h-3 w-3 ${testingId === wh.id ? 'animate-spin' : ''}`} />
                      <span>{testingId === wh.id ? 'Enviando Ping...' : 'Testar Conexão'}</span>
                    </button>

                    <button
                      onClick={async () => {
                        await fetch(`/api/webhooks/${wh.id}`, { method: 'DELETE' });
                        fetchWebhooks();
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Supported Events Catalog */}
        <div className="rounded-xl border border-[#22262E] bg-[#14171C] p-5 shadow-xl space-y-4">
          <div className="border-b border-[#22262E] pb-3">
            <h3 className="font-bold text-white text-sm">Eventos Suportados no n8n</h3>
            <p className="text-xs text-zinc-400">
              Payloads JSON com referência completa disponíveis para criação de fluxos
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {supportedEvents.map((ev) => (
              <div
                key={ev.name}
                className="p-3 rounded-lg bg-[#0D0F12] border border-[#22262E] space-y-1"
              >
                <div className="font-mono text-xs font-bold text-amber-400">{ev.name}</div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">{ev.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal: Configurar Webhook */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingWebhook ? 'Editar Webhook' : 'Novo Webhook n8n'}
        subtitle="Insira o endpoint Webhook URL gerado no seu nó Webhook do n8n"
      >
        {error && (
          <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300">
            {error}
          </div>
        )}
        <form onSubmit={handleSaveWebhook} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
              Webhook URL (n8n ou API de destino) *
            </label>
            <input
              type="url"
              required
              placeholder="https://seu-n8n.com/webhook/..."
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-amber-500 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1">
              Chave Secreta HMAC (X-BarberFlow-Signature)
            </label>
            <input
              type="text"
              required
              value={form.secret}
              onChange={(e) => setForm({ ...form, secret: e.target.value })}
              className="w-full rounded-lg border border-[#2A2E35] bg-[#0D0F12] px-3 py-2 text-xs text-white focus:border-amber-500 focus:outline-none font-mono"
            />
            <p className="text-[10px] text-zinc-500 mt-1">
              Usada para assinar o corpo da requisição via HMAC-SHA256 garantindo integridade.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="webhookActive"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="rounded bg-zinc-900 border-zinc-700 text-amber-500 focus:ring-amber-500"
            />
            <label htmlFor="webhookActive" className="text-xs text-zinc-300 font-medium">
              Webhook ativo e pronto para receber disparos
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
              disabled={saving}
              className="rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-bold text-black hover:bg-amber-400 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar Webhook'}
            </button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
