'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { ShieldAlert, RefreshCw, Lock } from 'lucide-react';

export interface AdminShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function AdminShell({
  children,
  title,
  subtitle,
  actions,
}: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          setIsAuthorized(false);
          setIsLoading(false);
          router.push('/login');
          return;
        }

        const data = await res.json();
        if (data.user && data.user.role === 'SUPER_ADMIN') {
          setUser(data.user);
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } catch (err) {
        console.error('Failed to verify Super Admin auth:', err);
        setIsAuthorized(false);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07090E] text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-sm font-semibold tracking-wide">Validando credenciais de Super Admin...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07090E] p-4">
        <div className="max-w-md w-full rounded-2xl bg-[#0E1118] border border-rose-500/30 p-6 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 text-rose-500 mb-4 border border-rose-500/20">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Acesso Restrito ao Operador do SaaS</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Esta área é exclusiva para administradores globais do BarberFlow. Usuários de barbearias clientes não possuem permissão para visualizar este console.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 py-2.5 px-4 rounded-xl bg-[#1A1E29] hover:bg-[#232738] text-xs font-bold text-slate-300 transition-colors"
            >
              Ir para Minha Barbearia
            </button>
            <button
              onClick={() => router.push('/login')}
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-black transition-colors shadow-lg shadow-amber-500/20"
            >
              Fazer Login como Admin
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#07090E]">
      {/* Sidebar Navigation */}
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        <AdminHeader
          userName={user?.name || 'Super Admin'}
          userEmail={user?.email || 'admin@barberflow.com'}
          onToggleSidebar={() => setSidebarOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {(title || actions) && (
            <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                {title && (
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
                    {subtitle}
                  </p>
                )}
              </div>
              {actions && (
                <div className="flex items-center gap-2.5 flex-wrap">
                  {actions}
                </div>
              )}
            </div>
          )}

          {children}
        </main>
      </div>
    </div>
  );
}
