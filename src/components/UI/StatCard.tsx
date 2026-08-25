import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  highlight?: 'gold' | 'emerald' | 'rose' | 'blue' | 'none';
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  highlight = 'none',
  className,
}: StatCardProps) {
  const highlightStyles = {
    gold: 'border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-transparent glow-gold',
    emerald: 'border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 to-transparent glow-emerald',
    rose: 'border-rose-500/30 bg-gradient-to-b from-rose-500/10 to-transparent glow-rose',
    blue: 'border-blue-500/30 bg-gradient-to-b from-blue-500/10 to-transparent',
    none: 'border-[#22262E] bg-[#14171C]',
  };

  const iconHighlight = {
    gold: 'text-amber-400 bg-amber-400/10',
    emerald: 'text-emerald-400 bg-emerald-400/10',
    rose: 'text-rose-400 bg-rose-400/10',
    blue: 'text-blue-400 bg-blue-400/10',
    none: 'text-zinc-400 bg-zinc-800/80',
  };

  return (
    <div
      className={cn(
        'relative rounded-xl border p-5 transition-all duration-200 hover:border-zinc-700',
        highlightStyles[highlight],
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          {title}
        </span>
        {Icon && (
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg p-2', iconHighlight[highlight])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-white">{value}</span>
        {trend && (
          <span
            className={cn(
              'text-xs font-medium',
              trend.isPositive ? 'text-emerald-400' : 'text-rose-400'
            )}
          >
            {trend.value}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1 text-xs text-zinc-400">{subtitle}</p>}
    </div>
  );
}
