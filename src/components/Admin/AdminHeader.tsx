'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShieldAlert, 
  LogOut, 
  Activity, 
  LifeBuoy, 
  UserCircle,
  ExternalLink,
  Bell
} from 'lucide-react';

interface AdminHeaderProps {
  userName?: string;
  userEmail?: string;
  systemStatus?: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  onToggleSidebar?: () => void;
}

export function AdminHeader({
  userName = 'Super Admin',
  userEmail = 'admin@barberflow.com',
  systemStatus = 'HEALTHY',
  onToggleSidebar,
}: AdminHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
      router.push('/login');
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#232733] bg-[#0E1118]/90 backdrop-blur-md px-4 sm:px-6">
      {/* Left: Mobile Toggle & Brand Indicator */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1A1E29] transition-colors"
            aria-label="Abrir menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 shadow-md shadow-amber-900/30 text-black font-black text-base">
            BF
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm tracking-wide">BARBERFLOW</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                SaaS Admin
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">Central de Controle Global</p>
          </div>
        </div>
      </div>

      {/* Right: Status, Actions, Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* System Health Badge */}
        <Link 
          href="/admin/saude" 
          className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-colors"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Plataforma Online</span>
        </Link>

        {/* Support link */}
        <Link
          href="/admin/suporte"
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1A1E29] transition-colors"
          title="Central de Suporte"
        >
          <LifeBuoy className="w-5 h-5" />
        </Link>

        {/* Audit link */}
        <Link
          href="/admin/auditoria"
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1A1E29] transition-colors"
          title="Logs de Auditoria"
        >
          <Activity className="w-5 h-5" />
        </Link>

        {/* User dropdown / info */}
        <div className="flex items-center gap-3 pl-2 border-l border-[#232733]">
          <div className="hidden md:block text-right">
            <p className="text-xs font-bold text-white leading-tight">{userName}</p>
            <p className="text-[10px] text-amber-400 font-mono">{userEmail}</p>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 transition-colors"
            title="Sair do Admin"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
}
