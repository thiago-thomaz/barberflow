'use client';

import React, { useState, useEffect } from 'react';
import { AdminShell } from '@/components/Admin/AdminShell';
import { Settings, Save, RefreshCw, Shield, Sliders, Globe, MessageSquare, Check } from 'lucide-react';

interface SaaSSetting {
  id: string;
  key: string;
  value: string;
  category: string;
  description: string | null;
}

export default function AdminConfiguracoesPage() {
  const [configs, setConfigs] = useState<SaaSSetting[]>([]);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/config');
      if (res.ok) {
        const json = await res.json();
        setConfigs(json.data || []);
        const initial: Record<string, string> = {};
        json.data?.forEach((c: SaaSSetting) => {
          initial[c.key] = c.value;
        });
        setFormValues(initial);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setFeedback(null);

      const payload = Object.entries(formValues).map(([key, value]) => ({
        key,
        value,
      }));

      const res = await fetch('/api/admin/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: payload,
          reason: 'Atualização das políticas e parâmetros do SaaS',
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Erro ao salvar configurações');
      }

      setFeedback({ type: 'success', message: 'Configurações do SaaS salvas com sucesso!' });
      loadConfigs();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const categories = [
    { key: 'GENERAL', label: 'Geral & Contato', icon: Globe },
    { key: 'OPERATIONAL', label: 'Operacional & Limites', icon: Sliders },
    { key: 'SECURITY', label: 'Segurança & LGPD', icon: Shield },
    { key: 'INTEGRATIONS', label: 'Integrações', icon: MessageSquare },
  ];

  return (
    <AdminShell
      title="Configurações do SaaS"
      subtitle="Definição de parâmetros globais, políticas de segurança, limites padrão e integrações"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={loadConfigs}
            disabled={loading || isSaving}
            className="p-2 rounded-xl bg-[#141824] text-slate-300 border border-[#232733]"
            title="Recarregar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || loading}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-black shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      }
    >
      {feedback && (
        <div
          className={`mb-6 rounded-2xl p-4 text-xs font-bold border ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="space-y-6">
        {categories.map((cat) => {
          const catConfigs = configs.filter((c) => c.category === cat.key);
          const Icon = cat.icon;

          if (catConfigs.length === 0) return null;

          return (
            <div key={cat.key} className="rounded-2xl bg-[#0E1118] border border-[#232733] p-6 shadow-sm">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 pb-3 border-b border-[#1C202C]">
                <Icon className="w-4 h-4 text-amber-400" />
                {cat.label}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {catConfigs.map((cfg) => (
                  <div key={cfg.key} className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-200">{cfg.key}</label>
                    {cfg.description && (
                      <p className="text-[11px] text-slate-400">{cfg.description}</p>
                    )}
                    <input
                      type="text"
                      value={formValues[cfg.key] ?? cfg.value}
                      onChange={(e) =>
                        setFormValues((prev) => ({ ...prev, [cfg.key]: e.target.value }))
                      }
                      className="w-full rounded-xl bg-[#141824] border border-[#232733] p-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </AdminShell>
  );
}
