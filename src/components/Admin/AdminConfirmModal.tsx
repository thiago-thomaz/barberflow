'use client';

import React, { useState } from 'react';
import { AlertTriangle, X, ShieldAlert } from 'lucide-react';

interface AdminConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
  title: string;
  description: string;
  impactWarning?: string;
  targetName?: string;
  confirmWord?: string; // If provided, user must type this word to confirm
  confirmButtonText?: string;
  variant?: 'danger' | 'warning' | 'info';
  requireReason?: boolean;
}

export function AdminConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  impactWarning,
  targetName,
  confirmWord,
  confirmButtonText = 'Confirmar Ação',
  variant = 'danger',
  requireReason = true,
}: AdminConfirmModalProps) {
  const [typedWord, setTypedWord] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const isWordValid = confirmWord ? typedWord.trim().toUpperCase() === confirmWord.toUpperCase() : true;
  const isReasonValid = requireReason ? reason.trim().length >= 5 : true;
  const canSubmit = isWordValid && isReasonValid && !isSubmitting;

  const handleConfirm = async () => {
    if (!canSubmit) return;
    try {
      setIsSubmitting(true);
      setError('');
      await onConfirm(reason);
      setTypedWord('');
      setReason('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Erro ao processar ação administrativa.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0E1118] border border-rose-500/40 p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1A1E29]"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-start gap-4 mb-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white leading-tight">{title}</h3>
            {targetName && (
              <p className="text-xs font-mono text-amber-400 mt-0.5">Alvo: {targetName}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-300 leading-relaxed mb-4">{description}</p>

        {/* Impact Alert */}
        {impactWarning && (
          <div className="mb-4 rounded-xl bg-rose-950/40 border border-rose-800/50 p-3.5 text-xs text-rose-200">
            <div className="flex items-center gap-2 font-bold text-rose-400 mb-1">
              <ShieldAlert className="w-4 h-4" />
              Impacto Operacional
            </div>
            <p className="leading-normal">{impactWarning}</p>
          </div>
        )}

        {/* Required Reason Input */}
        {requireReason && (
          <div className="mb-4 space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Motivo da Ação Administrativa (Obrigatório para Auditoria):
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Solicitação do proprietário / Suspensão por inadimplência..."
              rows={2}
              className="w-full rounded-xl bg-[#141824] border border-[#232733] p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>
        )}

        {/* Confirm Word Input */}
        {confirmWord && (
          <div className="mb-4 space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Digite <span className="font-mono text-rose-400 font-extrabold">{confirmWord}</span> para confirmar:
            </label>
            <input
              type="text"
              value={typedWord}
              onChange={(e) => setTypedWord(e.target.value)}
              placeholder={confirmWord}
              className="w-full rounded-xl bg-[#141824] border border-[#232733] px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:border-rose-500"
            />
          </div>
        )}

        {/* Error Feedback */}
        {error && (
          <div className="mb-4 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-[#1A1E29] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canSubmit}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? 'Processando...' : confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
}
