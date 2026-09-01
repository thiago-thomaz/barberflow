'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AdminShell } from '@/components/Admin/AdminShell';
import { AdminDataTable, Column } from '@/components/Admin/AdminDataTable';
import { AdminConfirmModal } from '@/components/Admin/AdminConfirmModal';
import { Users, Shield, ShieldCheck, UserCheck, RefreshCw, Edit, Store } from 'lucide-react';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  barbershop: {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
  } | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [targetRole, setTargetRole] = useState<string>('OWNER');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Erro ao carregar usuários');
      const json = await res.json();
      setUsers(json.data || []);
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: err.message || 'Erro ao carregar usuários' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleUpdateRole = async (reason: string) => {
    if (!selectedUser || !targetRole) return;

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: targetRole,
          reason,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Erro ao atualizar privilégios');
      }

      setFeedback({
        type: 'success',
        message: `Função de ${selectedUser.name} alterada para ${targetRole} com sucesso!`,
      });
      setIsRoleModalOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  const columns: Column<UserRow>[] = [
    {
      key: 'name',
      header: 'Nome / Usuário',
      render: (row) => (
        <div className="space-y-0.5">
          <p className="font-bold text-white text-xs">{row.name}</p>
          <p className="text-[11px] text-slate-400 font-mono">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Privilégio / Função',
      render: (row) => {
        const roleBadges: Record<string, { bg: string; text: string; icon: any }> = {
          SUPER_ADMIN: { bg: 'bg-amber-500/15 border-amber-500/30', text: 'text-amber-400', icon: ShieldCheck },
          OWNER: { bg: 'bg-sky-500/15 border-sky-500/30', text: 'text-sky-400', icon: Shield },
          BARBER: { bg: 'bg-emerald-500/15 border-emerald-500/30', text: 'text-emerald-400', icon: UserCheck },
          RECEPTIONIST: { bg: 'bg-purple-500/15 border-purple-500/30', text: 'text-purple-400', icon: Users },
        };

        const config = roleBadges[row.role] || { bg: 'bg-slate-800', text: 'text-slate-300', icon: Users };
        const Icon = config.icon;

        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold border uppercase tracking-wider ${config.bg} ${config.text}`}>
            <Icon className="w-3.5 h-3.5" />
            {row.role}
          </span>
        );
      },
    },
    {
      key: 'barbershop',
      header: 'Barbearia Vinculada',
      render: (row) => {
        if (!row.barbershop) {
          return <span className="text-slate-500 text-[11px]">Global (Sem tenant)</span>;
        }
        return (
          <Link
            href={`/admin/barbearias/${row.barbershop.id}`}
            className="text-xs font-semibold text-slate-200 hover:text-amber-400 transition-colors flex items-center gap-1.5"
          >
            <Store className="w-3.5 h-3.5 text-slate-500" />
            {row.barbershop.name}
          </Link>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Data de Cadastro',
      render: (row) => (
        <span className="text-xs text-slate-400 font-mono">
          {new Date(row.createdAt).toLocaleDateString('pt-BR')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      align: 'right',
      render: (row) => (
        <button
          onClick={() => {
            setSelectedUser(row);
            setTargetRole(row.role);
            setIsRoleModalOpen(true);
          }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#141824] hover:bg-[#1C2130] text-xs font-semibold text-amber-400 border border-[#232733] transition-colors"
        >
          <Edit className="w-3.5 h-3.5" />
          <span>Alterar Função</span>
        </button>
      ),
    },
  ];

  return (
    <AdminShell
      title="Gestão de Usuários & Acessos"
      subtitle="Controle global de operadores, proprietários de barbearias e privilégios de Super Admin"
      actions={
        <button
          onClick={loadUsers}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#141824] hover:bg-[#1C2130] text-xs font-semibold text-slate-300 border border-[#232733] transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          <span>Recarregar</span>
        </button>
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

      <AdminDataTable
        columns={columns}
        data={users}
        searchPlaceholder="Buscar por nome, email ou barbearia..."
        searchKey={(row) => `${row.name} ${row.email} ${row.role} ${row.barbershop?.name || ''}`}
        filters={[
          {
            key: 'role',
            label: 'Função / Role',
            options: [
              { label: 'Super Admin', value: 'SUPER_ADMIN' },
              { label: 'Proprietário (Owner)', value: 'OWNER' },
              { label: 'Barbeiro', value: 'BARBER' },
              { label: 'Recepcionista', value: 'RECEPTIONIST' },
            ],
          },
        ]}
        isLoading={loading}
        emptyMessage="Nenhum usuário encontrado."
      />

      {/* Role Change Modal */}
      {selectedUser && isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-[#0E1118] border border-[#232733] p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Alterar Privilégio do Usuário</h3>
            <p className="text-xs text-slate-400">
              Usuário: <span className="text-white font-bold">{selectedUser.name}</span> ({selectedUser.email})
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Nova Função:
              </label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="w-full rounded-xl bg-[#141824] border border-[#232733] p-2.5 text-xs text-white"
              >
                <option value="OWNER">OWNER (Proprietário de Barbearia)</option>
                <option value="BARBER">BARBER (Barbeiro / Profissional)</option>
                <option value="RECEPTIONIST">RECEPTIONIST (Recepcionista)</option>
                <option value="SUPER_ADMIN">SUPER_ADMIN (Acesso Total ao SaaS)</option>
              </select>
            </div>

            {targetRole === 'SUPER_ADMIN' && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-300">
                ⚠️ <span className="font-bold">Atenção:</span> Conceder SUPER_ADMIN dará a este usuário acesso total a todas as barbearias, dados financeiros e configurações do SaaS BarberFlow.
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#232733]">
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleUpdateRole('Alteração de permissão administrativa')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20"
              >
                Salvar Privilégio
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
