'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminShell } from '@/components/Admin/AdminShell';
import { LifeBuoy, AlertTriangle, Store, Bell, CheckCircle, RefreshCw, Eye } from 'lucide-react';

export default function AdminSuportePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadSupportData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/support');
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSupportData();
  }, []);

  return (
    <AdminShell
      title="Central de Suporte & Monitoramento"
      subtitle="Triagem de contas com pendências, contas inadimplentes e falhas operacionais"
      actions={
        <button
          onClick={loadSupportData}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#141824] hover:bg-[#1C2130] text-xs font-semibold text-slate-300 border border-[#232733]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          <span>Atualizar</span>
        </button>
      }
    >
      {/* Alert Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="rounded-2xl bg-[#0E1118] border border-amber-500/30 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Contas Inadimplentes</span>
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 mt-2">
            {data?.summary?.pastDueCount ?? 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Assinaturas aguardando acerto</p>
        </div>

        <div className="rounded-2xl bg-[#0E1118] border border-rose-500/30 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Contas Suspensas / Inativas</span>
            <Store className="w-5 h-5 text-rose-400" />
          </div>
          <p className="text-2xl font-black text-rose-400 mt-2">
            {data?.summary?.inactiveTenantCount ?? 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Barbearias fora de operação</p>
        </div>

        <div className="rounded-2xl bg-[#0E1118] border border-sky-500/30 p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Notificações com Erro</span>
            <Bell className="w-5 h-5 text-sky-400" />
          </div>
          <p className="text-2xl font-black text-sky-400 mt-2">
            {data?.summary?.failedNotificationCount ?? 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Falhas em envio de lembretes</p>
        </div>
      </div>

      {/* Inadimplentes list */}
      <div className="rounded-2xl bg-[#0E1118] border border-[#232733] p-6 shadow-sm mb-6">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Barbearias Inadimplentes / Vencidas
        </h3>

        {(!data?.pastDueSubscriptions || data.pastDueSubscriptions.length === 0) ? (
          <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>Nenhuma conta inadimplente no momento. Todas as assinaturas estão em dia!</span>
          </div>
        ) : (
          <div className="divide-y divide-[#1C202C]">
            {data.pastDueSubscriptions.map((sub: any) => (
              <div key={sub.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <Link
                    href={`/admin/barbearias/${sub.barbershop.id}`}
                    className="font-bold text-white hover:text-amber-400"
                  >
                    {sub.barbershop.name}
                  </Link>
                  <p className="text-[11px] text-slate-400">
                    Plano {sub.plan.name} • Valor: R$ {sub.plan.price.toFixed(2)}/mês
                  </p>
                </div>
                <Link
                  href={`/admin/barbearias/${sub.barbershop.id}`}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[#141824] hover:bg-[#1C2130] text-amber-400 text-xs font-semibold"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ver Conta</span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
