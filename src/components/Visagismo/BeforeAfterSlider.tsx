'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Sparkles, ZoomIn, Maximize2 } from 'lucide-react';

interface BeforeAfterSliderProps {
  originalImage: string;
  generatedImage: string;
  haircutName: string;
  faceShape?: string;
  onExpand?: () => void;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  originalImage,
  generatedImage,
  haircutName,
  faceShape,
  onExpand,
}) => {
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);
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
    <div className="space-y-2 select-none">
      <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold px-1">
        <span className="flex items-center gap-1.5 text-zinc-300">
          <span className="w-2 h-2 rounded-full bg-zinc-500" />
          Original (Você)
        </span>
        <span className="text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 text-[11px]">
          <Sparkles className="w-3 h-3 text-amber-400" />
          Novo Visual (IA)
        </span>
      </div>

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
        <span className="absolute bottom-3 left-3 text-[10px] font-bold text-white bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 pointer-events-none">
          Original
        </span>

        <span className="absolute bottom-3 right-3 text-[10px] font-bold text-amber-300 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full border border-amber-500/30 flex items-center gap-1 pointer-events-none">
          ✨ {haircutName}
        </span>

        {/* Botão de Expansão em Tela Cheia */}
        {onExpand && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExpand();
            }}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/60 backdrop-blur-md text-white/80 hover:text-amber-400 hover:bg-black/90 transition-all border border-white/10 shadow-lg"
            title="Ver em Tela Cheia"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <p className="text-[11px] text-zinc-500 text-center flex items-center justify-center gap-1">
        <span>Arraste o cursor</span>
        <span className="text-amber-400 font-bold">↔</span>
        <span>para comparar seu antes e depois com o novo visual</span>
      </p>
    </div>
  );
};
