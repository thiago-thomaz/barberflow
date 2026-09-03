'use client';

import React, { useState } from 'react';
import {
  Upload,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Eye,
  Layers,
  Cpu,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { HAIRCUTS_CATALOG } from '@/lib/visagism/catalog';

export function IdentityDebugSection() {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedHaircut, setSelectedHaircut] = useState<string>(HAIRCUTS_CATALOG[0].id);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPhotoFile(file);
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
      setResult(null);
      setError(null);
    }
  };

  const handleRunDebug = async () => {
    if (!photoFile) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('photo', photoFile);
      formData.append('haircutId', selectedHaircut);
      if (customPrompt.trim()) {
        formData.append('customPrompt', customPrompt.trim());
      }

      const res = await fetch('/api/admin/visagismo/debug', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao processar simulação.');
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6 shadow-xl">
      <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
            Identity Debug Mode — Laboratório Forense de Inpainting
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Inspeção visual e biométrica dos 4 estágios do pipeline: Original, Máscara, RAW da IA e Composto Final.
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          FLUX.1 Fill Dev + Identity Gate
        </span>
      </div>

      {/* Controles de Entrada */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Upload de Imagem */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-neutral-300 block">1. Foto do Usuário (Selfie)</label>
          <div className="relative border-2 border-dashed border-neutral-700 hover:border-amber-500/50 rounded-xl p-4 text-center cursor-pointer transition-colors bg-neutral-950/40">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            {photoPreview ? (
              <div className="flex items-center gap-3">
                <img src={photoPreview} alt="Preview" className="w-12 h-12 rounded-lg object-cover border border-neutral-700" />
                <div className="text-left text-xs truncate">
                  <p className="font-semibold text-white truncate">{photoFile?.name}</p>
                  <p className="text-neutral-400 text-[10px]">{(photoFile!.size / 1024).toFixed(0)} KB</p>
                </div>
              </div>
            ) : (
              <div className="py-2 text-neutral-400 flex flex-col items-center gap-1">
                <Upload className="w-5 h-5 text-neutral-500" />
                <span className="text-xs font-medium">Clique para selecionar foto</span>
              </div>
            )}
          </div>
        </div>

        {/* Seleção do Corte */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-neutral-300 block">2. Estilo do Catálogo</label>
          <select
            value={selectedHaircut}
            onChange={(e) => setSelectedHaircut(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
          >
            {HAIRCUTS_CATALOG.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name} ({h.category} - {h.maskType || 'hair'})
              </option>
            ))}
          </select>
        </div>

        {/* Botão de Disparo */}
        <div className="space-y-2 flex flex-col justify-end">
          <button
            type="button"
            disabled={!photoFile || loading}
            onClick={handleRunDebug}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processando FLUX.1 Fill...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Executar Pipeline Completo</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-red-950/40 border border-red-800/50 rounded-xl text-xs text-red-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Resultados em 4 Painéis */}
      {result && (
        <div className="space-y-4 pt-2 border-t border-neutral-800">
          {/* Barra de Métricas Forenses */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
              <span className="text-[10px] text-neutral-400 font-medium uppercase">Identity Similarity</span>
              <p className="text-base font-extrabold text-emerald-400 mt-0.5">
                {result.identityScore ? `${(result.identityScore * 100).toFixed(1)}%` : 'N/A'}
              </p>
            </div>
            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
              <span className="text-[10px] text-neutral-400 font-medium uppercase">Outside Diff</span>
              <p className="text-base font-extrabold text-emerald-400 mt-0.5">
                {result.outsideMaskPixelChangeRatio !== undefined
                  ? `${(result.outsideMaskPixelChangeRatio * 100).toFixed(2)}%`
                  : '0.00%'}
              </p>
            </div>
            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
              <span className="text-[10px] text-neutral-400 font-medium uppercase">Face Core SSIM</span>
              <p className="text-base font-extrabold text-amber-400 mt-0.5">
                {result.faceSSIM !== undefined ? `${(result.faceSSIM * 100).toFixed(1)}%` : '100%'}
              </p>
            </div>
            <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800">
              <span className="text-[10px] text-neutral-400 font-medium uppercase">Latência Total</span>
              <p className="text-base font-extrabold text-neutral-200 mt-0.5">
                {(result.latencyMs / 1000).toFixed(1)}s
              </p>
            </div>
          </div>

          {/* Os 4 Estágios Visuais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Original */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-300">
                <span>1. Original</span>
                <span className="text-[10px] text-neutral-500 font-normal">Foto Base</span>
              </div>
              <div className="aspect-[3/4] bg-neutral-950 rounded-xl overflow-hidden border border-neutral-800">
                <img src={result.originalBase64} alt="Original" className="w-full h-full object-cover" />
              </div>
            </div>

            {/* 2. Máscara */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-300">
                <span>2. Máscara Anatômica</span>
                <span className="text-[10px] text-neutral-500 font-normal">{result.maskMode}</span>
              </div>
              <div className="aspect-[3/4] bg-neutral-950 rounded-xl overflow-hidden border border-neutral-800">
                <img src={result.maskBase64} alt="Mask" className="w-full h-full object-cover" />
              </div>
            </div>

            {/* 3. RAW da IA */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-300">
                <span>3. Gerado RAW (IA)</span>
                <span className="text-[10px] text-amber-400 font-normal">FLUX.1 Fill</span>
              </div>
              <div className="aspect-[3/4] bg-neutral-950 rounded-xl overflow-hidden border border-neutral-800">
                {result.rawGeneratedBase64 ? (
                  <img src={result.rawGeneratedBase64} alt="RAW" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">
                    Não gerado
                  </div>
                )}
              </div>
            </div>

            {/* 4. Final Composto */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
                <span>4. Composto Final</span>
                <span className="text-[10px] text-emerald-500 font-normal">Identidade 100%</span>
              </div>
              <div className="aspect-[3/4] bg-neutral-950 rounded-xl overflow-hidden border-2 border-emerald-500/40 shadow-lg shadow-emerald-500/10">
                {result.finalCompositeBase64 ? (
                  <img src={result.finalCompositeBase64} alt="Final" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500">
                    Falha na composição
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
