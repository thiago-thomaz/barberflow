'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { Header } from './Header';

export interface AppShellProps {
  children: React.ReactNode;
  barbershopName?: string;
  slug?: string;
  userName?: string;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function AppShell({
  children,
  barbershopName = 'Barbearia Imperial',
  slug = 'barbearia-imperial',
  userName = 'Administrador',
  title,
  subtitle,
  actions,
}: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-[#0D0F12]">
      {/* Desktop Sidebar */}
      <Sidebar barbershopName={barbershopName} slug={slug} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-6">
        <Header title={title} subtitle={subtitle} userName={userName} />

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {actions && <div className="mb-6 flex justify-end gap-3">{actions}</div>}
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
