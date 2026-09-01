'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminShell } from '@/components/Admin/AdminShell';
import { AdminDataTable, Column } from '@/components/Admin/AdminDataTable';
import { ClipboardList, RefreshCw, User, Store, Clock, Eye } from 'lucide-react';

interface AuditLogRow {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  adminUser: {
    name: string;
    email: string;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export default function AdminAuditoriaPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogRow | null>(null);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/audit');
      if (res.ok) {
        const json = await res.json();
        setLogs(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const columns: Column<AuditLogRow>[] = [
    {
      key: 'action',
      header: 'Ação / Evento',
      render: (row) => (
        <span className="font-mono font-bold text-amber-400 text-xs">
          {row.action}
        </span>
      ),
    },
    {
      key: 'entity',
      header: 'Entidade / Alvo',
      render: (row) => (
        <div className="text-xs">
          <span className="font-bold text-white">{row.entity}</span>
          {row.entityId && (
            <p className="text-[10px] text-slate-500 font-mono">ID: {row.entityId}</p>
          )}
        </div>
      ),
    },
    {
      key: 'adminUser',
      header: 'Executado Por',
      render: (row) => (
        <div className="text-xs space-y-0.5">
          <p className="font-semibold text-slate-200">{row.adminUser?.name || 'Sistema'}</p>
          <p className="text-[10px] text-slate-500 font-mono">{row.adminUser?.email}</p>
        </div>
      ),
    },
    {
      key: 'tenant',
      header: 'Barbearia Impactada',
      render: (row) => {
        if (!row.tenant) return <span className="text-slate-500 text-[11px]">Global / N/A</span>;
        return (
          <Link
            href={`/admin/barbearias/${row.tenant.id}`}
            className="text-xs font-semibold text-sky-400 hover:underline"
          >
            {row.tenant.name}
          </Link>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Data / Hora',
      render: (row) => (
        <span className="text-xs text-slate-400 font-mono">
          {new Date(row.createdAt).toLocaleString('pt-BR')}
        </span>
      ),
    },
    {
      key: 'details',
      header: 'Detalhes',
      align: 'right',
      render: (row) => (
        <button
          onClick={() => setSelectedLog(row)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#141824] transition-colors"
          title="Ver Metadados"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <AdminShell
      title="Audit Log — Auditoria Global Imutável"
      subtitle="Rastreabilidade completa de todas as ações executadas por administradores na plataforma"
      actions={
        <button
          onClick={loadLogs}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#141824] hover:bg-[#1C2130] text-xs font-semibold text-slate-300 border border-[#232733]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          <span>Atualizar</span>
        </button>
      }
    >
      <AdminDataTable
        columns={columns}
        data={logs}
        searchPlaceholder="Buscar por ação, usuário, entidade ou metadados..."
        searchKey={(row) => `${row.action} ${row.entity} ${row.adminUser?.name || ''} ${row.tenant?.name || ''} ${row.metadata || ''}`}
        filters={[
          {
            key: 'action',
            label: 'Ação',
            options: [
              { label: 'Login', value: 'LOGIN' },
              { label: 'Suspender Tenant', value: 'SUSPEND_TENANT' },
              { label: 'Reativar Tenant', value: 'REACTIVATE_TENANT' },
              { label: 'Alterar Plano', value: 'CHANGE_PLAN' },
              { label: 'Alterar Usuário', value: 'UPDATE_USER' },
              { label: 'Registrar Pagamento', value: 'RECORD_PAYMENT' },
            ],
          },
        ]}
        isLoading={loading}
        emptyMessage="Nenhum log de auditoria encontrado."
      />

      {/* Metadata Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-[#0E1118] border border-[#232733] p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-amber-400" />
              Metadados da Ação Administrativa
            </h3>

            <div className="space-y-2 text-xs">
              <p className="text-slate-400">
                Ação: <span className="font-mono text-amber-400 font-bold">{selectedLog.action}</span>
              </p>
              <p className="text-slate-400">
                Admin: <span className="text-white font-bold">{selectedLog.adminUser?.name}</span> ({selectedLog.adminUser?.email})
              </p>
              <p className="text-slate-400">
                Data: <span className="font-mono text-slate-200">{new Date(selectedLog.createdAt).toLocaleString('pt-BR')}</span>
              </p>
              {selectedLog.ipAddress && (
                <p className="text-slate-400">
                  IP de Origem: <span className="font-mono text-slate-300">{selectedLog.ipAddress}</span>
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-[#1C202C]">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Metadados Registrados:</label>
              <pre className="mt-1.5 p-3 rounded-xl bg-[#0A0D14] border border-[#232733] text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48">
                {selectedLog.metadata
                  ? JSON.stringify(JSON.parse(selectedLog.metadata), null, 2)
                  : 'Nenhum metadado adicional gravado.'}
              </pre>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#232733]">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#141824] hover:bg-[#1C2130] text-white"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
