'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Upload,
  Loader2,
  Eye,
  Sliders,
} from 'lucide-react';
import { HAIRCUTS_CATALOG } from '@/lib/visagism/catalog';

export function IdentityDebugMode() {
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [haircutId, setHaircutId] = useState<string>('low-fade');
  const [maskMode, setMaskMode] = useState<'HAIR_ONLY' | 'BEARD_ONLY' | 'HAIR_AND_BEARD'>('HAIR_ONLY');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPhotoBase64(reader.result as string);
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRunDiagnostic = async () => {
    if (!photoBase64) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/visagismo/debug-identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoBase64,
          haircutId,
          mode: maskMode,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || json.message || 'Falha na execução do diagnóstico');
      }

      setResult(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <Sliders className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-white">Identity Debug Mode — Laboratório Visual</h2>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            Inspeção detalhada de 4 estágios: Original, Máscara, Imagem Bruta (RAW da IA) e Composição Final.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            FLUX.1 Fill Dev
          </span>
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Biometric Gate 2.0
          </span>
        </div>
      </div>

      {/* Controles de Entrada */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Upload de Foto */}
        <div>
          <label className="block text-xs font-semibold text-neutral-300 mb-2">1. Foto do Usuário para Teste</label>
          <label className="border-2 border-dashed border-neutral-700 hover:border-amber-500/50 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-neutral-950/50 transition-colors h-24">
            <Upload className="w-5 h-5 text-neutral-400 mb-1" />
            <span className="text-xs text-neutral-400">
              {photoBase64 ? 'Foto carregada ✓ Clique para trocar' : 'Selecionar imagem (JPG/PNG)'}
            </span>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        {/* Seleção de Estilo */}
        <div>
          <label className="block text-xs font-semibold text-neutral-300 mb-2">2. Estilo de Corte</label>
          <select
            value={haircutId}
            onChange={(e) => setHaircutId(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 h-11"
          >
            {HAIRCUTS_CATALOG.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.maskType})
              </option>
            ))}
          </select>
        </div>

        {/* Modo de Máscara e Botão de Ação */}
        <div className="flex flex-col justify-between">
          <label className="block text-xs font-semibold text-neutral-300 mb-2">3. Região Editável</label>
          <div className="flex gap-2">
            <select
              value={maskMode}
              onChange={(e) => setMaskMode(e.target.value as any)}
              className="flex-1 bg-neutral-950 border border-neutral-700 rounded-xl px-2.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 h-11"
            >
              <option value="HAIR_ONLY">Cabelo (HAIR_ONLY)</option>
              <option value="BEARD_ONLY">Barba (BEARD_ONLY)</option>
              <option value="HAIR_AND_BEARD">Ambos (HAIR_AND_BEARD)</option>
            </select>
            <button
              type="button"
              disabled={!photoBase64 || loading}
              onClick={handleRunDiagnostic}
              className="px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all h-11 shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processando (~18s)...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Diagnosticar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <XCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Painel de Resultados Visual de 4 Estágios */}
      {result && (
        <div className="space-y-6 pt-4 border-t border-neutral-800">
          {/* Métricas do Gate */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-center">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">Identity Similarity</span>
              <span className={`text-lg font-black mt-0.5 block ${result.metrics.identitySimilarity >= 0.70 ? 'text-emerald-400' : 'text-red-400'}`}>
                {(result.metrics.identitySimilarity * 100).toFixed(1)}%
              </span>
              <span className="text-[9px] text-neutral-500">Limiar: ≥ 70%</span>
            </div>

            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-center">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">Face SSIM</span>
              <span className={`text-lg font-black mt-0.5 block ${result.metrics.faceSSIM >= 0.95 ? 'text-emerald-400' : 'text-red-400'}`}>
                {(result.metrics.faceSSIM * 100).toFixed(1)}%
              </span>
              <span className="text-[9px] text-neutral-500">Limiar: ≥ 95%</span>
            </div>

            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-center">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">Outside Diff</span>
              <span className={`text-lg font-black mt-0.5 block ${result.metrics.outsideDiff <= 0.01 ? 'text-emerald-400' : 'text-red-400'}`}>
                {(result.metrics.outsideDiff * 100).toFixed(2)}%
              </span>
              <span className="text-[9px] text-neutral-500">Limiar: ≤ 1.0%</span>
            </div>

            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-center">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">Tempo Total</span>
              <span className="text-lg font-black text-amber-400 mt-0.5 block">
                {(result.metrics.latencyMs / 1000).toFixed(1)}s
              </span>
              <span className="text-[9px] text-neutral-500">Replicate API</span>
            </div>

            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-center">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">Modelo</span>
              <span className="text-xs font-bold text-white mt-1 block truncate">
                FLUX.1 Fill Dev
              </span>
              <span className="text-[9px] text-emerald-400">Oficial Ativo</span>
            </div>

            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-center">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">Veredito do Gate</span>
              <span className={`text-sm font-black mt-1 flex items-center justify-center gap-1 ${result.metrics.passed ? 'text-emerald-400' : 'text-red-400'}`}>
                {result.metrics.passed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                {result.metrics.passed ? 'APROVADO' : 'REJEITADO'}
              </span>
              <span className="text-[9px] text-neutral-500 truncate block">{result.metrics.reason}</span>
            </div>
          </div>

          {/* Grid de Comparação Visual em 4 Estágios */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. ORIGINAL */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-300">
                <span>1. Original (Input)</span>
                <span className="text-[10px] text-neutral-500">Entrada Real</span>
              </div>
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-neutral-800 bg-black">
                <img src={result.originalBase64} alt="Original" className="w-full h-full object-cover" />
              </div>
            </div>

            {/* 2. MASK */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-300">
                <span>2. Máscara Anatômica</span>
                <span className="text-[10px] text-neutral-500">Branco = Edição</span>
              </div>
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-neutral-800 bg-black">
                <img src={result.maskBase64} alt="Mask" className="w-full h-full object-cover" />
              </div>
            </div>

            {/* 3. GENERATED RAW */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-300">
                <span>3. Gerado RAW (IA Pura)</span>
                <span className="text-[10px] text-amber-400">Antes do Composite</span>
              </div>
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-neutral-800 bg-black">
                <img src={result.rawGeneratedBase64} alt="RAW Generated" className="w-full h-full object-cover" />
              </div>
            </div>

            {/* 4. FINAL COMPOSITE */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                <span>4. Composite Final (Entrega)</span>
                <span className="text-[10px] text-emerald-500">0.00% Diff Fora</span>
              </div>
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden border-2 border-emerald-500/40 bg-black shadow-lg shadow-emerald-500/10">
                <img src={result.finalCompositeBase64} alt="Final Composite" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
