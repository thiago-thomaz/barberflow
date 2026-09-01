'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface AdminStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: {
    text: string;
    variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  };
  trend?: {
    value: string;
    isPositive: boolean;
    label?: string;
  };
  href?: string;
  className?: string;
}

export function AdminStatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  badge,
  trend,
  href,
  className = '',
}: AdminStatCardProps) {
  const badgeVariants = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    info: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    neutral: 'bg-slate-800 text-slate-300 border-slate-700',
  };

  const Content = (
    <div
      className={`relative overflow-hidden rounded-2xl bg-[#0E1118] border border-[#232733] p-5 shadow-sm transition-all hover:border-[#343B4E] hover:shadow-md ${
        href ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-400">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white tracking-tight">{value}</span>
            {badge && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                  badgeVariants[badge.variant || 'neutral']
                }`}
              >
                {badge.text}
              </span>
            )}
          </div>
        </div>

        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 pt-3 border-t border-[#1C202C] flex items-center justify-between text-[11px]">
          {subtitle && <span className="text-slate-400 font-medium">{subtitle}</span>}
          {trend && (
            <span
              className={`font-bold flex items-center gap-1 ${
                trend.isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {trend.isPositive ? '↑' : '↓'} {trend.value}
              {trend.label && <span className="text-slate-500 font-normal">{trend.label}</span>}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{Content}</Link>;
  }

  return Content;
}
