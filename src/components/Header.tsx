'use client';

import React from 'react';
import { Bell, Search, Sparkles } from 'lucide-react';

export function Header({
  title,
  subtitle,
  userName,
}: {
  title?: string;
  subtitle?: string;
  userName?: string;
}) {
  return (
    <header className="flex items-center justify-between border-b border-[#22262E] bg-[#101216]/50 backdrop-blur-md px-6 py-4">
      <div>
        {title && <h1 className="text-xl font-bold tracking-tight text-white">{title}</h1>}
        {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        {userName && (
          <div className="flex items-center gap-2.5 rounded-full bg-zinc-900 border border-zinc-800 px-3 py-1.5">
            <div className="h-6 w-6 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-xs">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-medium text-zinc-300 hidden sm:inline">{userName}</span>
          </div>
        )}
      </div>
    </header>
  );
}
