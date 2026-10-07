'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  preferences: boolean;
}

const STORAGE_KEY = 'cdvsp_cookie_consent_v1';

export default function CookieConsent() {
  const [mounted, setMounted] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    preferences: false,
  });

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setShowBanner(true);
    } else {
      try {
        const parsed = JSON.parse(stored);
        setPreferences({
          necessary: true,
          analytics: Boolean(parsed.analytics),
          preferences: Boolean(parsed.preferences),
        });
      } catch {
        setShowBanner(true);
      }
    }

    const handleOpenSettings = () => {
      setShowModal(true);
      setShowBanner(false);
    };

    window.addEventListener('open-cookie-settings', handleOpenSettings);
    return () => window.removeEventListener('open-cookie-settings', handleOpenSettings);
  }, []);

  const saveConsent = (prefs: CookiePreferences) => {
    const finalPrefs = { ...prefs, necessary: true };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(finalPrefs));
    setPreferences(finalPrefs);
    setShowBanner(false);
    setShowModal(false);
  };

  const handleAcceptAll = () => {
    saveConsent({
      necessary: true,
      analytics: true,
      preferences: true,
    });
  };

  const handleRejectAll = () => {
    saveConsent({
      necessary: true,
      analytics: false,
      preferences: false,
    });
  };

  const handleSaveCustom = () => {
    saveConsent(preferences);
  };

  if (!mounted) return null;

  return (
    <>
      {/* Banner flotante inferior */}
      {showBanner && !showModal && (
        <aside
          role="dialog"
          aria-label="Aviso de cookies y privacidad"
          className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 bg-[#161616]/95 backdrop-blur-md border-t border-white/10 shadow-[0_-8px_32px_rgba(0,0,0,0.85)] animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex-1 pr-2">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="material-symbols-outlined text-primary text-[20px]">cookie</span>
                <span className="font-headline-sm text-sm uppercase tracking-wider text-white font-bold">
                  POLÍTICA DE COOKIES Y PRIVACIDAD
                </span>
              </div>
              <p className="font-body-sm text-xs text-tertiary leading-relaxed max-w-4xl">
                En el <strong>C.D. Voleibol San Pedro</strong> utilizamos cookies técnicas necesarias para el funcionamiento del portal y, de manera opcional, cookies analíticas para mejorar tu experiencia de navegación según el RGPD y la LSSI-CE. Puedes aceptar todas las cookies, rechazarlas o configurar tus preferencias en cualquier momento.{' '}
                <Link href="/cookies" className="text-primary underline hover:text-white transition-colors">
                  Más información en nuestra Política de Cookies
                </Link>.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0 self-stretch sm:self-auto justify-end">
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-white text-xs uppercase tracking-wider font-bold transition-all border border-white/10"
              >
                Configurar
              </button>
              <button
                type="button"
                onClick={handleRejectAll}
                className="px-4 py-2 bg-surface-container-highest hover:bg-white hover:text-black text-white text-xs uppercase tracking-wider font-bold transition-all"
              >
                Rechazar no esenciales
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                className="px-5 py-2 bg-primary-container hover:bg-secondary-container text-white text-xs uppercase tracking-wider font-bold transition-all shadow-md shadow-primary-container/20"
              >
                Aceptar todas
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Modal de Configuración Detallada */}
      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Panel de configuración de cookies"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className="bg-surface-container-lowest border border-white/15 max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-tertiary hover:text-white p-1 transition-colors"
              aria-label="Cerrar modal"
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary-container text-white flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">tune</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-widest text-primary font-bold block">
                  Centro de Preferencias de Privacidad
                </span>
                <h3 className="font-display-xl text-xl sm:text-2xl uppercase text-white">
                  CONFIGURACIÓN DE COOKIES
                </h3>
              </div>
            </div>

            <p className="font-body-sm text-xs text-tertiary mb-6 leading-relaxed">
              Elige qué categorías de cookies permites en tu navegador. Las cookies necesarias siempre están activas para asegurar la navegación básica, seguridad y funcionamiento técnico del portal del C.D. Voleibol San Pedro.
            </p>

            <div className="space-y-4 mb-6">
              {/* Cookies Técnicas */}
              <div className="p-4 bg-surface-container-low border border-white/5 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-headline-sm text-sm uppercase text-white font-bold">
                      Cookies Técnicas y Obligatorias
                    </h4>
                    <span className="px-2 py-0.5 bg-white/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                      Siempre activas
                    </span>
                  </div>
                  <p className="font-body-sm text-xs text-tertiary leading-relaxed">
                    Imprescindibles para que la web funcione correctamente (guardar tu consentimiento de privacidad, navegación segura y renderizado de calendarios y partidos oficiales).
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={true}
                  disabled={true}
                  className="mt-1 w-4 h-4 accent-primary cursor-not-allowed opacity-60"
                  aria-label="Cookies obligatorias siempre activas"
                />
              </div>

              {/* Cookies Analíticas */}
              <div className="p-4 bg-surface-container-low border border-white/5 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-headline-sm text-sm uppercase text-white font-bold">
                      Cookies Analíticas y de Rendimiento
                    </h4>
                  </div>
                  <p className="font-body-sm text-xs text-tertiary leading-relaxed">
                    Nos permiten medir de forma anónima el número de visitantes y páginas más consultadas para mejorar la experiencia de nuestras familias y aficionados.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) =>
                      setPreferences((prev) => ({ ...prev, analytics: e.target.checked }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
                </label>
              </div>

              {/* Cookies de Preferencias */}
              <div className="p-4 bg-surface-container-low border border-white/5 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-headline-sm text-sm uppercase text-white font-bold">
                      Cookies de Personalización
                    </h4>
                  </div>
                  <p className="font-body-sm text-xs text-tertiary leading-relaxed">
                    Permiten recordar tus filtros favoritos de categoría de voleibol y opciones visuales para tus próximas visitas.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={preferences.preferences}
                    onChange={(e) =>
                      setPreferences((prev) => ({ ...prev, preferences: e.target.checked }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container"></div>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
              <Link
                href="/cookies"
                onClick={() => setShowModal(false)}
                className="text-xs text-tertiary hover:text-white underline font-medium"
              >
                Ver listado completo de cookies
              </Link>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={handleRejectAll}
                  className="px-4 py-2 bg-surface-container-high hover:bg-surface-container-highest text-white text-xs uppercase font-bold tracking-wider transition-colors"
                >
                  Rechazar no esenciales
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustom}
                  className="px-5 py-2 bg-primary-container hover:bg-secondary-container text-white text-xs uppercase font-bold tracking-wider transition-colors shadow-md"
                >
                  Guardar configuración
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
