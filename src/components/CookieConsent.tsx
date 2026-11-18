'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Cookie, ShieldCheck, X } from 'lucide-react';

export interface CookiePreferences {
  version: number;
  status: 'accepted';
  necessary: boolean;
  analytics: boolean;
  preferences: boolean;
  updatedAt: string;
  expiresAt: string;
}

const STORAGE_KEY = 'cdv_cookie_consent_v2';
const CONSENT_VERSION = 2;
const CONSENT_TTL_MS = 365 * 24 * 60 * 60 * 1000; // 12 meses

export default function CookieConsent() {
  const [mounted, setMounted] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const modalRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  const closeModal = useCallback(() => {
    setShowModal(false);
    const prev = lastFocusedRef.current;
    if (prev && typeof prev.focus === 'function') {
      requestAnimationFrame(() => prev.focus());
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setShowBanner(true);
      } else {
        const parsed = JSON.parse(stored) as Partial<CookiePreferences>;
        const expiresMs = parsed.expiresAt ? new Date(parsed.expiresAt).getTime() : 0;
        const isExpired = !Number.isFinite(expiresMs) || expiresMs <= Date.now();
        if (parsed.version !== CONSENT_VERSION || isExpired) {
          setShowBanner(true);
        }
      }
    } catch {
      setShowBanner(true);
    }

    const handleOpenSettings = () => {
      lastFocusedRef.current = document.activeElement as HTMLElement | null;
      setShowModal(true);
      setShowBanner(false);
    };

    window.addEventListener('open-cookie-settings', handleOpenSettings);
    return () => window.removeEventListener('open-cookie-settings', handleOpenSettings);
  }, []);

  // Gestión de teclado (Escape + focus trap WCAG) en el modal de configuración
  useEffect(() => {
    if (!showModal) return;

    const modalEl = modalRef.current;
    if (modalEl) {
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
        closeModal();
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
        } else if (document.activeElement === last || !modalRef.current.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal, closeModal]);

  const acknowledgeTechnicalNotice = () => {
    const now = new Date();
    const record: CookiePreferences = {
      version: CONSENT_VERSION,
      status: 'accepted',
      necessary: true,
      analytics: false,
      preferences: false,
      updatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + CONSENT_TTL_MS).toISOString(),
    };

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch {
      // Ignorar errores de almacenamiento privado / cuota
    }

    setShowBanner(false);
    closeModal();
  };

  if (!mounted) return null;

  return (
    <>
      {/* Banner flotante inferior */}
      {showBanner && !showModal && (
        <aside
          role="dialog"
          aria-modal="false"
          aria-label="Aviso de cookies y almacenamiento técnico"
          className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 bg-[#161616]/95 backdrop-blur-md border-t border-white/10 shadow-[0_-8px_32px_rgba(0,0,0,0.85)] animate-slide-in-bottom"
        >
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex-1 pr-2">
              <div className="flex items-center gap-2 mb-1.5">
                <Cookie className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
                <span className="font-headline-sm text-sm uppercase tracking-wider text-white font-bold">
                  AVISO DE ALMACENAMIENTO TÉCNICO Y PRIVACIDAD
                </span>
              </div>
              <p className="font-body-sm text-xs text-tertiary leading-relaxed max-w-4xl">
                En el <strong className="text-white">C.D. Voleibol San Pedro</strong> utilizamos únicamente cookies y almacenamiento local estrictamente técnico y necesario para la seguridad de sesiones y la carga rápida del calendario deportivo.{' '}
                <strong className="text-white">No empleamos cookies publicitarias, analíticas ni rastreadores de terceros</strong> (exento de consentimiento previo conforme al Art. 22.2 LSSI-CE).{' '}
                <Link href="/cookies" className="text-primary underline hover:text-white transition-colors">
                  Ver Política de Cookies completa
                </Link>.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0 self-stretch sm:self-auto justify-end">
              <button
                type="button"
                onClick={() => {
                  lastFocusedRef.current = document.activeElement as HTMLElement | null;
                  setShowModal(true);
                }}
                className="px-4 py-2.5 bg-surface-container-high hover:bg-surface-container-highest text-white font-headline text-xs uppercase tracking-widest font-bold transition-colors border border-white/20 rounded-sm cursor-pointer"
              >
                Detalle técnico
              </button>
              <button
                type="button"
                onClick={acknowledgeTechnicalNotice}
                className="px-5 py-2.5 bg-primary-container hover:bg-cta-hover text-white font-headline font-bold text-xs uppercase tracking-widest rounded-sm transition-colors cursor-pointer"
              >
                Entendido
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Modal de Transparencia Técnica */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            ref={modalRef}
            className="bg-surface-container-lowest border border-white/15 max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar"
          >
            <button
              type="button"
              onClick={closeModal}
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center text-tertiary hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
              aria-label="Cerrar información de cookies"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            <div className="flex items-center gap-3 mb-4 pr-10">
              <div className="w-10 h-10 bg-primary-container text-white flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-widest text-primary font-bold block">
                  Transparencia y Privacidad (Art. 22.2 LSSI-CE)
                </span>
                <h3 id="cookie-modal-title" className="font-display-xl text-xl sm:text-2xl uppercase text-white">
                  COOKIES Y ALMACENAMIENTO LOCAL
                </h3>
              </div>
            </div>

            <p className="font-body-sm text-xs text-tertiary mb-6 leading-relaxed">
              Este portal solo utiliza claves técnicas locales y cookies propias estrictamente necesarias para el funcionamiento del sitio. Puedes consultar o limpiar estos datos locales en cualquier momento desde los ajustes de tu navegador.
            </p>

            <div className="space-y-4 mb-6">
              {/* Cookies Técnicas */}
              <div className="p-4 bg-surface-container-low border border-white/10 flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h4 className="font-headline-sm text-sm uppercase text-white font-bold">
                      Almacenamiento Técnico y Funcional Necesario
                    </h4>
                    <span className="px-2 py-0.5 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                      Siempre activo · Exento
                    </span>
                  </div>
                  <p className="font-body-sm text-xs text-tertiary leading-relaxed">
                    Incluye la sesión autenticada de secretaría (<code className="text-white">cdv_admin_session</code>), la constancia de este aviso (<code className="text-white">cdv_cookie_consent_v2</code>), el control local anti-duplicado MVP y la caché rápida local de calendarios y clasificaciones.
                  </p>
                </div>
              </div>

              {/* Analítica / Terceros */}
              <div className="p-4 bg-surface-container-low border border-white/10 flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h4 className="font-headline-sm text-sm uppercase text-white font-bold">
                      Analítica, Publicidad y Rastreadores de Terceros
                    </h4>
                    <span className="px-2 py-0.5 bg-white/10 border border-white/15 text-tertiary text-[10px] font-bold uppercase tracking-wider">
                      No utilizado
                    </span>
                  </div>
                  <p className="font-body-sm text-xs text-tertiary leading-relaxed">
                    El portal no instala cookies de analítica web, perfiles publicitarios ni píxeles de redes sociales en ningún dispositivo.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <Link
                href="/cookies"
                onClick={closeModal}
                className="text-xs text-primary hover:text-white underline font-medium"
              >
                Ver listado completo de cookies
              </Link>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={acknowledgeTechnicalNotice}
                  className="px-5 py-2.5 bg-primary-container hover:bg-cta-hover text-white text-xs uppercase font-bold tracking-wider transition-colors shadow-md cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
