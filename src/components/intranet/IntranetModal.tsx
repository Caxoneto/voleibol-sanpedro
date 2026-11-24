'use client';

import React, { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export type IntranetModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type IntranetModalAccent = 'primary' | 'amber' | 'rose' | 'emerald';

export interface IntranetModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: IntranetModalSize;
  accent?: IntranetModalAccent;
  footer?: ReactNode;
  closeOnBackdrop?: boolean;
  headerRight?: ReactNode;
  children: ReactNode;
}

const SIZE_CLASS_MAP: Record<IntranetModalSize, string> = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-2xl',
  xl: 'sm:max-w-4xl',
  '2xl': 'sm:max-w-5xl',
};

const ACCENT_BAR_MAP: Record<IntranetModalAccent, string> = {
  primary: 'from-primary-container via-red-500 to-amber-500',
  amber: 'from-amber-500 via-amber-400 to-orange-500',
  rose: 'from-rose-600 via-rose-500 to-primary-container',
  emerald: 'from-emerald-600 via-emerald-400 to-teal-500',
};

/**
 * Ventana modal unificada de la Intranet del Club.
 * Soporta teclado (Escape), bloqueo de scroll de fondo y adaptación bottom-sheet en móvil.
 */
export default function IntranetModal({
  isOpen,
  onClose,
  title,
  subtitle,
  size = 'lg',
  accent = 'primary',
  footer,
  closeOnBackdrop = true,
  headerRight,
  children,
}: IntranetModalProps) {
  const titleId = useId();
  const modalRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      lastFocusedRef.current = document.activeElement as HTMLElement | null;
    }
    if (!isOpen && wasOpenRef.current) {
      const prev = lastFocusedRef.current;
      if (prev && typeof prev.focus === 'function') {
        requestAnimationFrame(() => prev.focus());
      }
      lastFocusedRef.current = null;
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const modalEl = modalRef.current;
    if (modalEl && !modalEl.contains(document.activeElement)) {
      const focusable = modalEl.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        requestAnimationFrame(() => focusable[0].focus());
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusable = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else if (
          document.activeElement === last ||
          !modalRef.current.contains(document.activeElement)
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) {
          onCloseRef.current();
        }
      }}
    >
      <div
        ref={modalRef}
        className={`relative w-full ${SIZE_CLASS_MAP[size]} bg-surface-container-low border border-white/15 rounded-none max-h-[92dvh] sm:max-h-[90dvh] flex flex-col overflow-hidden shadow-brutal-dark`}
      >
        <div
          className={`h-1 w-full bg-gradient-to-r ${ACCENT_BAR_MAP[accent]} shrink-0`}
          aria-hidden="true"
        />

        <div className="shrink-0 flex items-start justify-between gap-3 px-4 sm:px-6 py-4 border-b border-white/10 bg-surface-container">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="font-headline text-base sm:text-lg font-bold uppercase tracking-wide text-on-surface leading-snug break-words"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-tertiary mt-0.5 leading-snug break-words">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {headerRight}
            <button
              type="button"
              onClick={onClose}
              aria-label={`Cerrar ${title}`}
              className="w-10 h-10 inline-flex items-center justify-center rounded-none text-tertiary hover:text-white hover:bg-white/10 border border-transparent hover:border-white/15 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-4">
          {children}
        </div>

        {footer && (
          <div className="shrink-0 px-4 sm:px-6 py-3.5 border-t border-white/10 bg-surface-container/80">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
