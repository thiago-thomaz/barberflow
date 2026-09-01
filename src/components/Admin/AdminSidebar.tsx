'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Store,
  Users,
  Package,
  CreditCard,
  DollarSign,
  TrendingUp,
  BarChart3,
  LifeBuoy,
  HeartPulse,
  ClipboardList,
  Settings,
  ShieldCheck,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const navItems = [
  {
    category: 'Geral',
    items: [
      { name: 'Visão Geral', href: '/admin', icon: LayoutDashboard },
      { name: 'Barbearias', href: '/admin/barbearias', icon: Store },
      { name: 'Usuários', href: '/admin/usuarios', icon: Users },
    ],
  },
  {
    category: 'Monetização & Planos',
    items: [
      { name: 'Planos', href: '/admin/planos', icon: Package },
      { name: 'Assinaturas', href: '/admin/assinaturas', icon: CreditCard },
      { name: 'Pagamentos', href: '/admin/pagamentos', icon: DollarSign },
      { name: 'Financeiro SaaS', href: '/admin/financeiro', icon: TrendingUp },
    ],
  },
  {
    category: 'Inteligência & Operação',
    items: [
      { name: 'Indicadores', href: '/admin/indicadores', icon: BarChart3 },
      { name: 'Suporte', href: '/admin/suporte', icon: LifeBuoy },
      { name: 'Saúde do Sistema', href: '/admin/saude', icon: HeartPulse },
      { name: 'Auditoria', href: '/admin/auditoria', icon: ClipboardList },
      { name: 'Configurações', href: '/admin/configuracoes', icon: Settings },
    ],
  },
];

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  const isCurrent = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-[#232733] bg-[#0A0D14] transition-transform duration-300 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-[#232733] bg-[#0E1118]">
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-black font-black text-sm shadow">
              BF
            </div>
            <div>
              <span className="font-extrabold text-white text-sm tracking-wider">BARBERFLOW</span>
              <span className="block text-[10px] text-amber-400 font-semibold tracking-widest uppercase">Admin Console</span>
            </div>
          </Link>

          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1A1E29]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
          {navItems.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {group.category}
              </p>
              <div className="space-y-0.5 mt-1.5">
                {group.items.map((item) => {
                  const active = isCurrent(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                        active
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-[#141824]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${active ? 'text-amber-400' : 'text-slate-400'}`} />
                        <span>{item.name}</span>
                      </div>
                      {active && <ChevronRight className="w-3.5 h-3.5 text-amber-400" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info & quick link */}
        <div className="p-3 border-t border-[#232733] bg-[#0E1118]/60">
          <div className="p-2.5 rounded-lg bg-[#141824] border border-[#232733]">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
              <span className="flex items-center gap-1.5 text-amber-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                SUPER ADMIN
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">
                v20.0
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Ambiente de Operação Global</p>
          </div>
        </div>
      </aside>
    </>
  );
}
