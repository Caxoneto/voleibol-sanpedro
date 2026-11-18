'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Eraser, CheckCircle2, PenTool } from 'lucide-react';

interface NormalizedPoint {
  x: number;
  y: number;
}

interface SignaturePadProps {
  onSignatureChange: (dataUrl: string | null) => void;
  disabled?: boolean;
  compact?: boolean;
  hintLabel?: string;
}

export function SignaturePad({
  onSignatureChange,
  disabled = false,
  compact = false,
  hintLabel = '✕ Firma del declarante',
}: SignaturePadProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const isDrawingRef = useRef(false);
  const hasSignatureRef = useRef(false);
  const pathsRef = useRef<NormalizedPoint[][]>([]);
  const currentPathRef = useRef<NormalizedPoint[]>([]);
  const lastSizeRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const activePointerIdRef = useRef<number | null>(null);

  const [hasSignature, setHasSignature] = useState(false);

  const drawBackgroundAndPaths = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Fondo blanco sólido para garantizar legibilidad física y en PDF
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Línea de base de firma sutil
    ctx.save();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(24, height - 22);
    ctx.lineTo(Math.max(24, width - 24), height - 22);
    ctx.stroke();
    ctx.restore();

    // Repintar todos los trazos vectoriales guardados (resiste resize/teclado móvil)
    ctx.strokeStyle = '#000000';
    ctx.fillStyle = '#000000';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of pathsRef.current) {
      if (stroke.length === 0) continue;
      if (stroke.length === 1) {
        const px = stroke[0].x * width;
        const py = stroke[0].y * height;
        ctx.beginPath();
        ctx.arc(px, py, 1.2, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }

      ctx.beginPath();
      ctx.moveTo(stroke[0].x * width, stroke[0].y * height);
      for (let i = 1; i < stroke.length; i++) {
        ctx.lineTo(stroke[i].x * width, stroke[i].y * height);
      }
      ctx.stroke();
    }
  }, []);

  const setupCanvas = useCallback(
    (force = false) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const widthChanged = Math.abs(rect.width - lastSizeRef.current.width) > 1;
      const heightChanged = Math.abs(rect.height - lastSizeRef.current.height) > 1;
      if (!force && !widthChanged && !heightChanged) return;

      lastSizeRef.current = { width: rect.width, height: rect.height };
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawBackgroundAndPaths(ctx, rect.width, rect.height);
    },
    [drawBackgroundAndPaths]
  );

  useEffect(() => {
    setupCanvas(true);

    const container = containerRef.current;
    let observer: ResizeObserver | null = null;

    if (typeof ResizeObserver !== 'undefined' && container) {
      observer = new ResizeObserver(() => {
        setupCanvas(false);
      });
      observer.observe(container);
    }

    const handleResize = () => setupCanvas(false);
    window.addEventListener('resize', handleResize);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [setupCanvas]);

  const getNormalizedPoint = (clientX: number, clientY: number): { px: number; py: number; norm: NormalizedPoint } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const px = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const py = Math.max(0, Math.min(rect.height, clientY - rect.top));
    return {
      px,
      py,
      norm: { x: px / rect.width, y: py / rect.height },
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const point = getNormalizedPoint(e.clientX, e.clientY);
    if (!point) return;

    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Algunos navegadores no permiten pointer capture en ciertos dispositivos
    }

    activePointerIdRef.current = e.pointerId;
    isDrawingRef.current = true;
    hasSignatureRef.current = true;
    setHasSignature(true);

    const newStroke: NormalizedPoint[] = [point.norm];
    currentPathRef.current = newStroke;
    pathsRef.current.push(newStroke);

    ctx.beginPath();
    ctx.arc(point.px, point.py, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || disabled) return;
    if (activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const point = getNormalizedPoint(e.clientX, e.clientY);
    if (!point || rect.width <= 0 || rect.height <= 0) return;

    const stroke = currentPathRef.current;
    const prev = stroke[stroke.length - 1];
    stroke.push(point.norm);

    if (prev) {
      ctx.beginPath();
      ctx.moveTo(prev.x * rect.width, prev.y * rect.height);
      ctx.lineTo(point.px, point.py);
      ctx.stroke();
    }
  };

  const finishDrawing = (e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    if (e && activePointerIdRef.current !== null && e.pointerId !== activePointerIdRef.current) return;

    if (e && canvasRef.current) {
      try {
        if (canvasRef.current.hasPointerCapture(e.pointerId)) {
          canvasRef.current.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignorar
      }
    }

    isDrawingRef.current = false;
    activePointerIdRef.current = null;
    currentPathRef.current = [];

    const canvas = canvasRef.current;
    if (canvas && hasSignatureRef.current && pathsRef.current.length > 0) {
      const dataUrl = canvas.toDataURL('image/png');
      onSignatureChange(dataUrl);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    isDrawingRef.current = false;
    activePointerIdRef.current = null;
    pathsRef.current = [];
    currentPathRef.current = [];
    hasSignatureRef.current = false;
    setHasSignature(false);
    setupCanvas(true);
    onSignatureChange(null);
  };

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className={`relative w-full ${
          compact ? 'h-32 sm:h-36' : 'h-44 sm:h-48'
        } rounded-xl bg-white border-2 border-slate-300 hover:border-slate-400 shadow-inner transition-colors overflow-hidden touch-none select-none`}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrawing}
          onPointerCancel={finishDrawing}
          aria-label="Área de firma manuscrita"
          className="w-full h-full cursor-crosshair touch-none block"
        />

        {!hasSignature && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            <PenTool className="w-6 h-6 text-slate-500 mb-1.5" aria-hidden="true" />
            <p className="text-xs text-slate-700 font-medium">
              Firma aquí con el dedo (móvil/tablet) o el ratón (ordenador)
            </p>
            <span className="text-[11px] text-slate-500 mt-0.5">Trazo manuscrito fidedigno</span>
          </div>
        )}

        {hasSignature && (
          <div className="absolute top-2 right-2 pointer-events-none flex items-center gap-1 text-[11px] font-bold text-emerald-900 bg-emerald-50 border border-emerald-400 px-2 py-0.5 rounded shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
            <span>Firma registrada</span>
          </div>
        )}

        <div className="absolute bottom-2 left-3 right-3 truncate pointer-events-none text-[10px] sm:text-[11px] font-mono text-slate-500">
          {hintLabel}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-tertiary">
        <span>Realiza un trazo claro y firme. Tendrá valor probatorio oficial.</span>
        <button
          type="button"
          onClick={clearCanvas}
          disabled={!hasSignature || disabled}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white/90 hover:text-white bg-surface-container-high hover:bg-surface-container-highest border border-white/15 rounded transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
        >
          <Eraser className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Borrar y repetir</span>
        </button>
      </div>
    </div>
  );
}
