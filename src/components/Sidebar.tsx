'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Repeat,
  Scissors,
  UserCheck,
  DollarSign,
  Zap,
  Settings,
  LogOut,
  ExternalLink,
  Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sidebar({ barbershopName, slug }: { barbershopName?: string; slug?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/agenda', label: 'Agenda', icon: Calendar },
    { href: '/clientes', label: 'Clientes', icon: Users },
    {
      href: '/recorrencia',
      label: 'Recorrência',
      icon: Flame,
      badge: 'Oportunidade',
    },
    { href: '/servicos', label: 'Serviços', icon: Scissors },
    { href: '/barbeiros', label: 'Barbeiros', icon: UserCheck },
    { href: '/financeiro', label: 'Financeiro', icon: DollarSign },
    { href: '/automacoes', label: 'Automações & n8n', icon: Zap },
    { href: '/configuracoes', label: 'Configurações', icon: Settings },
  ];

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-[#22262E] bg-[#101216] p-4 text-zinc-300 min-h-screen">
      {/* Brand */}
      <div className="flex items-center gap-3 px-2 py-3 mb-4 border-b border-[#22262E]">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-black font-extrabold shadow-lg shadow-amber-500/20">
          <Scissors className="h-5 w-5" />
        </div>
        <div className="overflow-hidden">
          <span className="block font-bold tracking-tight text-white text-base">BarberFlow</span>
          <span className="block text-xs text-amber-400/90 truncate font-medium">
            {barbershopName || 'Minha Barbearia'}
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="space-y-1 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                isActive
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'text-zinc-400 hover:bg-[#1A1D23] hover:text-white'
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn('h-4 w-4', isActive ? 'text-amber-400' : 'text-zinc-400 group-hover:text-white')} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Public Link button */}
      {slug && (
        <div className="p-2 mb-2">
          <a
            href={`/b/${slug}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2 px-3 text-xs font-semibold rounded-lg bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors border border-zinc-700/60"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Página Pública</span>
          </a>
        </div>
      )}

      {/* Logout */}
      <div className="pt-2 border-t border-[#22262E]">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-rose-500/10 hover:text-rose-400 rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
