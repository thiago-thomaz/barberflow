'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, Users, Flame, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/agenda', label: 'Agenda', icon: Calendar },
    { href: '/recorrencia', label: 'Recorrência', icon: Flame },
    { href: '/clientes', label: 'Clientes', icon: Users },
    { href: '/configuracoes', label: 'Ajustes', icon: Settings },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#101216]/95 backdrop-blur-md border-t border-[#22262E] px-2 py-1.5 flex justify-around items-center">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium transition-colors',
              isActive ? 'text-amber-400' : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            <Icon className={cn('h-5 w-5 mb-0.5', isActive ? 'text-amber-400' : 'text-zinc-400')} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
