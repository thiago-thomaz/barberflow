'use client';

import React, { useState, useEffect } from 'react';
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
  barbershopName: initialBarbershopName,
  slug: initialSlug,
  userName: initialUserName,
  title,
  subtitle,
  actions,
}: AppShellProps) {
  const [barbershopName, setBarbershopName] = useState(initialBarbershopName || '');
  const [slug, setSlug] = useState(initialSlug || '');
  const [userName, setUserName] = useState(initialUserName || '');

  useEffect(() => {
    async function loadUserData() {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            if (data.user.barbershop?.name) {
              setBarbershopName(data.user.barbershop.name);
            }
            if (data.user.barbershop?.slug) {
              setSlug(data.user.barbershop.slug);
            }
            if (data.user.name) {
              setUserName(data.user.name);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load user info:', err);
      }
    }
    loadUserData();
  }, []);

  return (
    <div className="flex min-h-screen bg-[#0D0F12]">
      {/* Desktop Sidebar */}
      <Sidebar
        barbershopName={barbershopName || initialBarbershopName || 'BarberFlow'}
        slug={slug || initialSlug}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-6">
        <Header
          title={title}
          subtitle={subtitle}
          userName={userName || initialUserName || 'Administrador'}
        />

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
