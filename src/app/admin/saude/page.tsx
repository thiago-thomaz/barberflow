'use client';

import React, { useState, useEffect } from 'react';
import { AdminShell } from '@/components/Admin/AdminShell';
import { HeartPulse, Database, MessageSquare, Server, Zap, RefreshCw, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export default function AdminSaudePage() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadHealth = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/health');
      if (res.ok) {
        const json = await res.json();
        setHealth(json);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  const getStatusBadge = (status: string) => {
    if (status === 'ONLINE' || status === 'CONNECTED' || status === 'WORKING' || status === 'ACTIVE') {
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle className="w-3.5 h-3.5" />
          {status}
        </span>
      );
    }
    if (status === 'WARNING' || status === 'STARTING') {
      return (
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <AlertTriangle className="w-3.5 h-3.5" />
          {status}
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <XCircle className="w-3.5 h-3.5" />
        {status}
      </span>
    );
  };

  return (
    <AdminShell
      title="Saúde da Infraestrutura & Plataforma"
      subtitle="Monitoramento em tempo real do Next.js, SQLite, integração WhatsApp e barramentos"
      actions={
        <button
          onClick={loadHealth}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#141824] hover:bg-[#1C2130] text-xs font-semibold text-slate-300 border border-[#232733]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          <span>Executar Healthcheck</span>
        </button>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Service 1: Application Server */}
        <div className="rounded-2xl bg-[#0E1118] border border-[#232733] p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#1C202C] mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Next.js App Server</h3>
                <p className="text-[11px] text-slate-400">Aplicação Principal</p>
              </div>
            </div>
            {getStatusBadge(health?.services?.app?.status || 'UNKNOWN')}
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Versão:</span>
              <span className="font-mono text-white font-bold">{health?.services?.app?.version}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Node.js:</span>
              <span className="font-mono text-white">{health?.services?.app?.nodeVersion}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Tempo de Atividade (Uptime):</span>
              <span className="font-mono text-slate-200">{health?.services?.app?.uptimeSeconds}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Memória em Uso (Heap):</span>
              <span className="font-mono text-amber-400 font-bold">{health?.services?.app?.memory?.heapUsedMB} MB</span>
            </div>
          </div>
        </div>

        {/* Service 2: Database */}
        <div className="rounded-2xl bg-[#0E1118] border border-[#232733] p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#1C202C] mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Banco de Dados (SQLite)</h3>
                <p className="text-[11px] text-slate-400">Prisma ORM Local</p>
              </div>
            </div>
            {getStatusBadge(health?.services?.database?.status || 'UNKNOWN')}
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Latência da Query:</span>
              <span className="font-mono font-bold text-emerald-400">{health?.services?.database?.latencyMs} ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total de Barbearias:</span>
              <span className="font-mono text-white">{health?.services?.database?.records?.tenants}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total de Agendamentos:</span>
              <span className="font-mono text-white">{health?.services?.database?.records?.appointments}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Total de Logs de Auditoria:</span>
              <span className="font-mono text-white">{health?.services?.database?.records?.auditLogs}</span>
            </div>
          </div>
        </div>

        {/* Service 3: WAHA WhatsApp */}
        <div className="rounded-2xl bg-[#0E1118] border border-[#232733] p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#1C202C] mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">WAHA WhatsApp Engine</h3>
                <p className="text-[11px] text-slate-400">Serviço de Mensageria Oficial</p>
              </div>
            </div>
            {getStatusBadge(health?.services?.whatsapp?.status || 'UNKNOWN')}
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Provedor:</span>
              <span className="font-mono text-white">{health?.services?.whatsapp?.provider}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Sessão Padrão:</span>
              <span className="font-mono text-white">{health?.services?.whatsapp?.session}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Latência do Endpoint:</span>
              <span className="font-mono text-emerald-400">{health?.services?.whatsapp?.latencyMs} ms</span>
            </div>
          </div>
        </div>

        {/* Service 4: Automations */}
        <div className="rounded-2xl bg-[#0E1118] border border-[#232733] p-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#1C202C] mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Barramento de Automações (n8n)</h3>
                <p className="text-[11px] text-slate-400">Webhooks HMAC-SHA256</p>
              </div>
            </div>
            {getStatusBadge(health?.services?.automations?.status || 'UNKNOWN')}
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Mecanismo:</span>
              <span className="text-white font-medium">{health?.services?.automations?.engine}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Assinatura de Segurança:</span>
              <span className="font-mono text-emerald-400 font-bold">HMAC-SHA256 Ativa</span>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
