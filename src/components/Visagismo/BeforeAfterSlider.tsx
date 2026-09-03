'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Sparkles, Maximize2, Columns, Eye, Sliders } from 'lucide-react';

interface BeforeAfterSliderProps {
  originalImage: string;
  generatedImage: string;
  haircutName: string;
  faceShape?: string;
  onExpand?: () => void;
}

type ViewMode = 'slider' | 'side-by-side' | 'hold-compare';

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  originalImage,
  generatedImage,
  haircutName,
  faceShape,
  onExpand,
}) => {
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('slider');
  const [isHoldingOriginal, setIsHoldingOriginal] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || !e.touches[0]) return;
      handleMove(e.touches[0].clientX);
    },
    [isDragging, handleMove]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      handleMove(e.clientX);
    },
    [isDragging, handleMove]
  );

  const handleEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, handleMouseMove, handleTouchMove, handleEnd]);

  return (
    <div className="space-y-3 select-none">
      {/* Barra de Controles e Modos de Visualização */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
          <button
            type="button"
            onClick={() => setViewMode('slider')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
              viewMode === 'slider'
                ? 'bg-amber-500 text-black shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Comparador Deslizante"
          >
            <Sliders className="w-3 h-3" />
            <span>Slider</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('side-by-side')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
              viewMode === 'side-by-side'
                ? 'bg-amber-500 text-black shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Lado a Lado"
          >
            <Columns className="w-3 h-3" />
            <span>Lado a Lado</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('hold-compare')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
              viewMode === 'hold-compare'
                ? 'bg-amber-500 text-black shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
            title="Segurar para Alternar"
          >
            <Eye className="w-3 h-3" />
            <span>Alternar</span>
          </button>
        </div>

        {onExpand && (
          <button
            type="button"
            onClick={onExpand}
            className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-amber-400 transition-all flex items-center gap-1 text-[11px] font-semibold"
            title="Ver em Tela Cheia"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Expandir</span>
          </button>
        )}
      </div>

      {/* MODO 1: SLIDER INTERATIVO */}
      {viewMode === 'slider' && (
        <div
          ref={containerRef}
          className="relative aspect-square sm:aspect-[4/3] w-full rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-2xl cursor-ew-resize group"
          onMouseDown={(e) => {
            setIsDragging(true);
            handleMove(e.clientX);
          }}
          onTouchStart={(e) => {
            if (e.touches[0]) {
              setIsDragging(true);
              handleMove(e.touches[0].clientX);
            }
          }}
        >
          {/* Layer 1: Imagem Gerada / Depois (Fundo Completo) */}
          <img
            src={generatedImage}
            alt={`Você com corte ${haircutName}`}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />

          {/* Layer 2: Imagem Original / Antes (Clip Path Recortado) */}
          <div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
          >
            <img
              src={originalImage}
              alt="Sua foto original"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>

          {/* Linha Divisória & Handle de Arrasto */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400 pointer-events-none shadow-[0_0_12px_rgba(251,191,36,0.8)]"
            style={{ left: `${sliderPosition}%` }}
          >
            {/* Círculo Central com Ícone */}
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-amber-500 text-black font-extrabold text-[10px] flex items-center justify-center shadow-lg border-2 border-white ring-4 ring-black/40">
              ↔
            </div>
          </div>

          {/* Badges Flutuantes nas Pontas */}
          <span className="absolute bottom-3 left-3 text-[10px] font-bold text-white bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 pointer-events-none">
            Original
          </span>

          <span className="absolute bottom-3 right-3 text-[10px] font-bold text-amber-300 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-500/30 flex items-center gap-1 pointer-events-none">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>{haircutName}</span>
          </span>
        </div>
      )}

      {/* MODO 2: LADO A LADO */}
      {viewMode === 'side-by-side' && (
        <div className="grid grid-cols-2 gap-2">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-lg group">
            <img src={originalImage} alt="Foto original" className="w-full h-full object-cover" />
            <span className="absolute bottom-2 left-2 text-[10px] font-bold text-white bg-black/80 px-2 py-0.5 rounded-full border border-white/10">
              Antes (Original)
            </span>
          </div>
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-zinc-950 border-2 border-amber-500/40 shadow-lg group">
            <img src={generatedImage} alt={haircutName} className="w-full h-full object-cover" />
            <span className="absolute bottom-2 left-2 text-[10px] font-bold text-amber-300 bg-black/80 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              <span>Depois (IA)</span>
            </span>
          </div>
        </div>
      )}

      {/* MODO 3: SEGURAR PARA ALTERNAR */}
      {viewMode === 'hold-compare' && (
        <div
          className="relative aspect-square sm:aspect-[4/3] w-full rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-2xl cursor-pointer select-none active:scale-[0.99] transition-transform"
          onMouseDown={() => setIsHoldingOriginal(true)}
          onMouseUp={() => setIsHoldingOriginal(false)}
          onMouseLeave={() => setIsHoldingOriginal(false)}
          onTouchStart={() => setIsHoldingOriginal(true)}
          onTouchEnd={() => setIsHoldingOriginal(false)}
        >
          <img
            src={isHoldingOriginal ? originalImage : generatedImage}
            alt={isHoldingOriginal ? 'Original' : haircutName}
            className="w-full h-full object-cover transition-opacity duration-150"
          />
          <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md border border-white/10 text-[11px] font-bold flex items-center gap-1.5">
            <span className={isHoldingOriginal ? 'text-white' : 'text-amber-400'}>
              {isHoldingOriginal ? '👀 Exibindo: Foto Original' : `✨ Exibindo: ${haircutName}`}
            </span>
          </div>
          <div className="absolute bottom-3 inset-x-3 text-center">
            <span className="text-[10px] font-semibold text-zinc-300 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
              Toque e segure para ver sua foto original
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1">
        <span>Rosto 100% preservado</span>
        <span className="text-amber-400/90 font-medium">Harmonizado para rosto {faceShape || 'Oval'}</span>
      </div>
    </div>
  );
};
