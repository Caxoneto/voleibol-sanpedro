'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { CLUB_INFO } from '@/lib/data-store';
import { InstagramIcon, FacebookIcon } from '@/components/SocialIcons';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

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
    <nav className="w-full bg-[#131313] border-b border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.7)] relative z-40">
      <div className="h-20 max-w-7xl mx-auto px-4 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="group flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="relative w-10 h-10 overflow-hidden rounded-none border border-white/10 group-hover:border-primary-container transition-colors shrink-0">
            <Image
              src="/images/logo.jpg"
              alt="C.D. Voleibol San Pedro Logo"
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-display-xl text-xl sm:text-2xl tracking-wider uppercase text-on-surface leading-none group-hover:text-primary transition-colors whitespace-nowrap">
              C.D.V. SAN PEDRO
            </span>
            <span className="font-label-sm text-[10px] uppercase tracking-widest text-primary font-bold whitespace-nowrap mt-0.5">
              Portal Oficial del Club
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden xl:flex items-center gap-6">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link font-label-md text-xs uppercase tracking-wider pb-1 transition-colors ${
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
              className="w-9 h-9 flex items-center justify-center bg-surface-container-high hover:bg-gradient-to-r hover:from-[#833ab4] hover:via-[#fd1d1d] hover:to-[#fcb045] text-white transition-all border border-white/10 shadow-[2px_2px_0px_0px_#0e0e0e]"
            >
              <InstagramIcon className="w-4 h-4 text-white" />
            </a>
            <a
              href={CLUB_INFO.facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook Oficial del Club"
              title="Facebook C.D. Voleibol San Pedro"
              className="w-9 h-9 flex items-center justify-center bg-surface-container-high hover:bg-[#1877F2] text-white transition-all border border-white/10 shadow-[2px_2px_0px_0px_#0e0e0e]"
            >
              <FacebookIcon className="w-4 h-4 text-white" />
            </a>
          </div>

          {/* Botón Jugador@s hacia FeelSports: solo icono doble monigote en mobile, texto completo en sm+ */}
          <a
            href="https://feelsports.es/"
            target="_blank"
            rel="noopener noreferrer"
            title="Portal de Jugador@s FeelSports"
            aria-label="Portal de Jugador@s FeelSports"
            className="inline-flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 bg-primary-container hover:bg-secondary-container text-white text-xs font-label-md uppercase font-bold tracking-wider transition-all duration-300 shadow-[3px_3px_0px_0px_#0e0e0e] hover:shadow-[0_0_15px_rgba(217,4,41,0.5)] active:scale-95"
          >
            {/* Icono de doble monigote en versión mobile */}
            <svg
              className="w-5 h-5 shrink-0 sm:hidden fill-current"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
            </svg>
            <span className="hidden sm:inline-flex items-center gap-1.5">
              <span>Jugador@s</span>
              <span className="material-symbols-outlined text-[15px]" aria-hidden="true">open_in_new</span>
            </span>
          </a>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden w-10 h-10 flex items-center justify-center bg-surface-container-high text-on-surface border border-white/10 hover:text-primary"
            aria-label={mobileMenuOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
          >
            <span className="material-symbols-outlined text-[24px]" aria-hidden="true">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación móvil"
          className="xl:hidden bg-[#131313] border-b border-primary-container/40 px-6 py-5 shadow-2xl max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain animate-in slide-in-from-top duration-200"
        >
          <div className="flex flex-col gap-4">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`font-display-xl text-2xl uppercase tracking-wider py-2 border-b border-white/5 flex items-center justify-between ${
                    active ? 'text-primary' : 'text-on-surface hover:text-primary'
                  }`}
                >
                  <span>{link.label}</span>
                  <span className="material-symbols-outlined text-[20px] text-tertiary" aria-hidden="true">
                    chevron_right
                  </span>
                </Link>
              );
            })}
            <div className="pt-2 flex flex-col gap-3">
              {/* Redes Sociales en Menú Móvil */}
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={CLUB_INFO.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white py-2.5 font-label-md text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_#0e0e0e]"
                >
                  <InstagramIcon className="w-4 h-4 text-white" />
                  <span>Instagram</span>
                </a>
                <a
                  href={CLUB_INFO.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#1877F2] text-white py-2.5 font-label-md text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 shadow-[2px_2px_0px_0px_#0e0e0e]"
                >
                  <FacebookIcon className="w-4 h-4 text-white" />
                  <span>Facebook</span>
                </a>
              </div>

              <a
                href="https://feelsports.es/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center bg-primary-container hover:bg-secondary-container text-white py-3 font-label-md text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_#0e0e0e]"
              >
                <span>Portal Jugador@s (FeelSports)</span>
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">open_in_new</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
