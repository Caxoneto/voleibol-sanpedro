'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Eraser, CheckCircle2 } from 'lucide-react';

interface SignaturePadProps {
  onSignatureChange: (dataUrl: string | null) => void;
  disabled?: boolean;
}

export function SignaturePad({ onSignatureChange, disabled = false }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // Inicializa el canvas con fondo blanco puro y trazo negro sólido de alta fidelidad
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      // Fondo blanco sólido para garantizar legibilidad física y en PDF
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Línea de base de firma sutil
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(24, rect.height - 24);
      ctx.lineTo(rect.width - 24, rect.height - 24);
      ctx.stroke();
      ctx.setLineDash([]); // Restablecer línea continua

      // Configuración de trazo para pluma negra sólida y nítida
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  }, []);

  useEffect(() => {
    setupCanvas();
    window.addEventListener('resize', setupCanvas);
    return () => window.removeEventListener('resize', setupCanvas);
  }, [setupCanvas]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    } else if ('clientX' in e) {
      return {
        x: (e as MouseEvent).clientX - rect.left,
        y: (e as MouseEvent).clientY - rect.top,
      };
    }
    return { x: 0, y: 0 };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const pos = getCoordinates(e.nativeEvent);
    lastPosRef.current = pos;

    // Punto inicial nítido
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 1.1, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();

    // Restablecer estilos de trazo continuo
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Evitar scroll en pantalla táctil mientras se firma
    if ('touches' in e.nativeEvent) {
      e.preventDefault();
    }

    const curPos = getCoordinates(e.nativeEvent);
    if (!lastPosRef.current) {
      lastPosRef.current = curPos;
      return;
    }

    // Trazo segmento a segmento para evitar acumulación de anti-aliasing (trazo doble)
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(curPos.x, curPos.y);
    ctx.stroke();

    lastPosRef.current = curPos;

    if (!hasSignature) {
      setHasSignature(true);
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    lastPosRef.current = null;

    const canvas = canvasRef.current;
    if (canvas && hasSignature) {
      // Exportar en PNG con fondo blanco y firma negra pura
      const dataUrl = canvas.toDataURL('image/png');
      onSignatureChange(dataUrl);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setupCanvas();
    setHasSignature(false);
    lastPosRef.current = null;
    onSignatureChange(null);
  };

  return (
    <div className="space-y-2">
      <div className="relative w-full h-44 sm:h-48 rounded-xl bg-white border-2 border-slate-300 hover:border-slate-400 shadow-inner transition-colors overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full cursor-crosshair"
        />

        {!hasSignature && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            <span className="material-symbols-outlined text-slate-400 text-3xl mb-1">draw</span>
            <p className="text-xs text-slate-500 font-medium">
              Firma aquí con el dedo (móvil/tablet) o el ratón (ordenador)
            </p>
            <span className="text-[10px] text-slate-400 mt-0.5">Trazo manuscrito fidedigno</span>
          </div>
        )}

        {hasSignature && (
          <div className="absolute top-2 right-2 pointer-events-none flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Firma registrada</span>
          </div>
        )}

        {/* Indicador de línea de firma */}
        <div className="absolute bottom-2 left-6 pointer-events-none text-[10px] font-mono text-slate-400">
          ✕ Firma del declarante
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-tertiary">
        <span>Realiza un trazo claro y firme. Tendrá valor probatorio oficial.</span>
        <button
          type="button"
          onClick={clearCanvas}
          disabled={!hasSignature || disabled}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-white/70 hover:text-white bg-surface-container-high hover:bg-surface-container-highest border border-white/10 rounded transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
        >
          <Eraser className="w-3.5 h-3.5" />
          <span>Borrar y repetir</span>
        </button>
      </div>
    </div>
  );
}
