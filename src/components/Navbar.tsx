'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ChevronRight, Menu, Users, X } from 'lucide-react';
import { CLUB_INFO } from '@/lib/club-info';
import { InstagramIcon, FacebookIcon } from '@/components/SocialIcons';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const toggleBtnRef = useRef<HTMLButtonElement | null>(null);

  const closeDrawer = useCallback(() => {
    setMobileMenuOpen(false);
    requestAnimationFrame(() => toggleBtnRef.current?.focus());
  }, []);

  // Cerrar el cajón móvil automáticamente al navegar
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Gestión accesible de teclado (Escape + focus trap WCAG) en drawer móvil
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const drawerEl = drawerRef.current;
    if (drawerEl) {
      const focusable = drawerEl.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        requestAnimationFrame(() => focusable[0].focus());
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeDrawer();
        return;
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusable = Array.from(
          drawerRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first || !drawerRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last || !drawerRef.current.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen, closeDrawer]);

  const navLinks = [
    { label: 'Inicio', href: '/' },
    { label: 'Plantillas', href: '/plantillas' },
    { label: 'Calendario', href: '/calendario' },
    { label: 'Partidos', href: '/partidos' },
    { label: 'Clasificación', href: '/clasificacion' },
    { label: 'Noticias', href: '/noticias' },
    { label: 'Fan-Zone', href: '/fan-zone' },
    { label: 'Patrocinio', href: '/patrocinio' },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav aria-label="Navegación principal" className="w-full bg-[#131313] border-b border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.7)] relative z-40">
      <div className="h-20 max-w-[1440px] mx-auto px-4 lg:px-6 xl:px-8 flex items-center justify-between gap-2 xl:gap-4">
        {/* Brand Logo */}
        <Link href="/" className="group flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
          <div className="relative w-10 h-10 overflow-hidden rounded-none border border-white/15 group-hover:border-primary-container transition-colors shrink-0">
            <Image
              src="/images/logo.jpg"
              alt="C.D. Voleibol San Pedro Logo"
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-display-xl text-xl sm:text-2xl xl:text-xl 2xl:text-2xl tracking-wider uppercase text-on-surface leading-none group-hover:text-primary transition-colors whitespace-nowrap">
              C.D.V. SAN PEDRO
            </span>
            <span className="font-label-sm text-[10px] uppercase tracking-widest text-primary font-bold whitespace-nowrap mt-0.5">
              Portal Oficial del Club
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden xl:flex items-center gap-3 2xl:gap-5 shrink-0">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`nav-link font-label-md text-[11px] 2xl:text-xs uppercase tracking-wide 2xl:tracking-wider pb-1 transition-colors whitespace-nowrap ${
                  active
                    ? 'active-link text-primary font-bold'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Redes Sociales Oficiales Desktop */}
          <div className="hidden lg:flex items-center gap-1.5 mr-1">
            <a
              href={CLUB_INFO.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram Oficial del Club"
              title="Instagram @voleibolsanpedro"
              className="w-9 h-9 flex items-center justify-center bg-surface-container-high hover:bg-gradient-to-r hover:from-[#7a219f] hover:via-[#b80022] hover:to-[#9e021d] text-white transition-all border border-white/15 shadow-[2px_2px_0px_0px_#0e0e0e]"
            >
              <InstagramIcon className="w-4 h-4 text-white" />
            </a>
            <a
              href={CLUB_INFO.facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook Oficial del Club"
              title="Facebook C.D. Voleibol San Pedro"
              className="w-9 h-9 flex items-center justify-center bg-surface-container-high hover:bg-[#1460c7] text-white transition-all border border-white/15 shadow-[2px_2px_0px_0px_#0e0e0e]"
            >
              <FacebookIcon className="w-4 h-4 text-white" />
            </a>
          </div>

          {/* Botón Acceso Club / Familias */}
          <Link
            href="/acceso"
            title="Acceso Club"
            aria-label="Acceso Club"
            className="inline-flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 bg-primary-container hover:bg-cta-hover text-white text-xs font-label-md uppercase font-bold tracking-wider transition-all duration-300 shadow-[3px_3px_0px_0px_#0e0e0e] hover:shadow-[0_0_15px_rgba(217,4,41,0.5)] active:translate-x-[1px] active:translate-y-[1px]"
          >
            <Users className="w-5 h-5 shrink-0 sm:hidden" aria-hidden="true" />
            <span className="hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap">
              <Users className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Acceso Club</span>
            </span>
          </Link>

          {/* Mobile Menu Toggle */}
          <button
            ref={toggleBtnRef}
            type="button"
            onClick={() => (mobileMenuOpen ? closeDrawer() : setMobileMenuOpen(true))}
            className="xl:hidden w-10 h-10 flex items-center justify-center bg-surface-container-high text-on-surface border border-white/15 hover:text-primary cursor-pointer"
            aria-label={mobileMenuOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" aria-hidden="true" />
            ) : (
              <Menu className="w-6 h-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          ref={drawerRef}
          id="mobile-nav-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación móvil"
          className="xl:hidden bg-[#131313] border-b border-primary-container/40 px-6 py-5 shadow-2xl max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain animate-slide-in-top"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-bold uppercase tracking-widest text-tertiary">
                Menú del Portal
              </span>
              <button
                type="button"
                onClick={closeDrawer}
                aria-label="Cerrar menú móvil"
                className="w-10 h-10 flex items-center justify-center text-tertiary hover:text-white bg-surface-container-high border border-white/15 rounded-none cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`font-display-xl text-2xl uppercase tracking-wider py-2 border-b border-white/5 flex items-center justify-between ${
                    active ? 'text-primary' : 'text-on-surface hover:text-primary'
                  }`}
                >
                  <span>{link.label}</span>
                  <ChevronRight className="w-5 h-5 text-tertiary" aria-hidden="true" />
                </Link>
              );
            })}

            <div className="pt-2 flex flex-col gap-3">
              {/* Redes Sociales en Menú Móvil con contraste AA */}
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={CLUB_INFO.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gradient-to-r from-[#7a219f] via-[#b80022] to-[#9e021d] text-white py-2.5 font-label-md text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_#0e0e0e]"
                >
                  <InstagramIcon className="w-4 h-4 text-white" />
                  <span>Instagram</span>
                </a>
                <a
                  href={CLUB_INFO.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#1460c7] hover:bg-[#1150a8] text-white py-2.5 font-label-md text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_#0e0e0e]"
                >
                  <FacebookIcon className="w-4 h-4 text-white" />
                  <span>Facebook</span>
                </a>
              </div>

              <Link
                href="/acceso"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center bg-primary-container hover:bg-cta-hover text-white py-3 font-label-md text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_#0e0e0e] active:translate-x-[1px] active:translate-y-[1px]"
              >
                <Users className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Acceso Club / Familias</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
