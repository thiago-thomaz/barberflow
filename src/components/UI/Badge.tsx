import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  // Appointment status
  AGENDADO: { label: 'Agendado', bg: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-400' },
  CONFIRMADO: { label: 'Confirmado', bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-400' },
  EM_ATENDIMENTO: { label: 'Em Atendimento', bg: 'bg-purple-500/10 border-purple-500/20', text: 'text-purple-400', dot: 'bg-purple-400 animate-pulse' },
  CONCLUIDO: { label: 'Concluído', bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  CANCELADO: { label: 'Cancelado', bg: 'bg-rose-500/10 border-rose-500/20', text: 'text-rose-400', dot: 'bg-rose-400' },
  NO_SHOW: { label: 'Não Compareceu', bg: 'bg-zinc-500/10 border-zinc-500/20', text: 'text-zinc-400', dot: 'bg-zinc-400' },

  // Customer status
  NOVO: { label: 'Novo Cliente', bg: 'bg-sky-500/10 border-sky-500/20', text: 'text-sky-400', dot: 'bg-sky-400' },
  ATIVO: { label: 'Ativo', bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  EM_RISCO: { label: 'Em Risco', bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-400' },
  INATIVO: { label: 'Inativo', bg: 'bg-rose-500/10 border-rose-500/20', text: 'text-rose-400', dot: 'bg-rose-400' },
  VIP: { label: 'VIP', bg: 'bg-yellow-500/10 border-yellow-500/20', text: 'text-yellow-400', dot: 'bg-yellow-400' },

  // Recurrence rate
  ALTA: { label: 'Recorrência Alta', bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  MEDIA: { label: 'Recorrência Média', bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-400', dot: 'bg-amber-400' },
  BAIXA: { label: 'Recorrência Baixa', bg: 'bg-zinc-500/10 border-zinc-500/20', text: 'text-zinc-400', dot: 'bg-zinc-400' },
};

export function Badge({ status, className, size = 'md' }: BadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    bg: 'bg-zinc-800 border-zinc-700',
    text: 'text-zinc-300',
    dot: 'bg-zinc-400',
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-medium',
    lg: 'px-3 py-1.5 text-sm font-semibold',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border',
        config.bg,
        config.text,
        sizeClasses[size],
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  );
}
