'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useStreaming } from '@/lib/use-streaming';

export default function HeroLiveBlock() {
  const { status: streamingStatus } = useStreaming();
  const isLive = streamingStatus.active && !!streamingStatus.url;

  return (
    <div
      className={`flex flex-row items-center justify-between sm:justify-end ${
        isLive ? 'gap-1.5 sm:gap-4 lg:gap-6' : 'gap-2.5 sm:gap-5 lg:gap-6'
      } self-start md:self-center shrink-0 w-full md:w-auto transition-all`}
    >
      {/* Emblema / Lema Oficial de la Temporada: "Yo Voley... ¿y tú?" (Recreación fiel de RRSS) */}
      <div
        className={`shrink-0 select-none -rotate-6 transform transition-all duration-300 hover:-rotate-3 ${
          isLive
            ? 'px-1 sm:px-3 py-0.5 max-w-[68px] sm:max-w-none'
            : 'px-2 sm:px-3 py-1'
        }`}
        aria-label="Lema oficial: Yo Voley... ¿y tú?"
      >
        <div
          className="flex flex-col items-center leading-none"
          style={{ fontFamily: 'var(--font-brush), cursive' }}
        >
          {/* Línea superior blanca: Yo Voley... */}
          <span
            className={`text-white tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] transition-all ${
              isLive
                ? 'text-xs sm:text-2xl md:text-3xl lg:text-4xl'
                : 'text-3xl sm:text-4xl lg:text-5xl'
            }`}
          >
            Yo Voley...
          </span>

          {/* Trazo de pincel rojo intenso debajo de Yo Voley... */}
          <svg
            viewBox="0 0 240 22"
            className={`-my-0.5 overflow-visible transition-all ${
              isLive
                ? 'w-14 sm:w-36 md:w-48 h-2 sm:h-3.5'
                : 'w-40 sm:w-52 lg:w-60 h-4 sm:h-5'
            }`}
            aria-hidden="true"
          >
            <path
              d="M4 15 C 65 8, 155 5, 236 3"
              stroke="#e10600"
              strokeWidth="4.5"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M14 19 C 80 13, 165 9, 226 7"
              stroke="#b80000"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              opacity="0.85"
            />
          </svg>

          {/* Línea inferior roja: ¿y tú? */}
          <span
            className={`text-[#ff1111] tracking-wide drop-shadow-[0_2px_10px_rgba(225,6,0,0.45)] transition-all ${
              isLive
                ? 'text-base sm:text-3xl md:text-4xl lg:text-5xl -mt-0.5'
                : 'text-4xl sm:text-5xl lg:text-6xl -mt-1'
            }`}
          >
            ¿y tú?
          </span>

          {/* Corazón dibujado a mano en trazo blanco debajo */}
          <svg
            viewBox="0 0 44 42"
            className={`text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] transition-all ${
              isLive
                ? 'w-3 h-3 sm:w-5 sm:h-5 mt-0.5 -ml-2'
                : 'w-6 h-6 sm:w-7 sm:h-7 mt-1 -ml-4'
            }`}
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M21 37 C 18 32, 6 23, 7 13 C 7.8 7, 13.5 5.5, 17.5 10.5 C 19.2 12.6, 20.4 15.2, 21 17 C 21.8 13.5, 24.5 6.5, 30 6.5 C 35 6.5, 37.5 11.5, 36 17.5 C 34 25.5, 24.5 33, 21 37 Z"
              stroke="currentColor"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Botón oficial de YouTube En Directo! (Aparece cuando el streaming está activo) */}
      {isLive && streamingStatus.url && (
        <div className="shrink-0 flex items-center animate-fade-in">
          <a
            href={streamingStatus.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Ver partido en directo en YouTube (Abre en ventana nueva)"
            aria-label="Ver streaming oficial en YouTube (En directo, abre en una nueva pestaña)"
            className="group relative flex items-center gap-2 sm:gap-3 px-2.5 py-1.5 sm:px-4 sm:py-2.5 bg-gradient-to-r from-red-600 via-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-headline font-black uppercase tracking-wider rounded-md border-2 border-red-400 shadow-[0_0_20px_rgba(239,68,68,0.7)] hover:shadow-[0_0_35px_rgba(239,68,68,0.95)] hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
          >
            {/* Icono oficial de YouTube */}
            <div className="w-5 h-5 sm:w-7 sm:h-7 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
              <svg className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-[#ff0000] fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>

            <div className="flex flex-col items-start leading-none">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-white"></span>
                </span>
                <span className="text-[11px] sm:text-sm font-extrabold tracking-wide drop-shadow-sm whitespace-nowrap">
                  En directo!
                </span>
              </div>
              <span className="text-[8px] sm:text-[10px] text-white/90 font-mono font-medium tracking-normal mt-0.5 whitespace-nowrap">
                YouTube Live ↗
              </span>
            </div>
          </a>
        </div>
      )}

      {/* Promoción Lotería de Navidad 2026 - Animación de escala progresiva y color alternado */}
      <div className="shrink-0 flex flex-col items-center pt-3 sm:pt-5 pb-1 sm:pb-2">
        <Link
          href="/noticias/loteria-navidad-2026-voleibol-san-pedro-15586"
          aria-label="Lotería de Navidad 2026 del C.D. Voleibol San Pedro: Número 15.586. Haz clic para leer los detalles"
          title="Lotería de Navidad 2026: Número 15.586 - C.D. Voleibol San Pedro (Haz clic para ver cómo adquirir décimos)"
          className="group relative flex flex-col items-center cursor-pointer select-none"
        >
          {/* Etiqueta / Pill promocional festiva */}
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 px-2 py-0.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black font-headline font-black text-[8px] sm:text-[10px] uppercase tracking-wider rounded-full shadow-[0_2px_10px_rgba(245,158,11,0.55)] whitespace-nowrap transition-transform duration-200 group-hover:scale-105 pointer-events-none border border-amber-100/70">
            Lotería · 15.586
          </span>

          {/* Décimo optimizado y sin márgenes con animación scaleAndColorChange */}
          <div
            className={`animate-lottery-pulse relative ${
              isLive
                ? 'w-24 sm:w-32 md:w-36 lg:w-44'
                : 'w-28 sm:w-36 md:w-40 lg:w-44'
            } aspect-[950/598] rounded-md overflow-hidden border-2 border-amber-400 bg-white`}
          >
            <Image
              src="/images/noticias/loteria-navidad-2026.png"
              alt="Décimo oficial de Lotería de Navidad 2026 del C.D. Voleibol San Pedro - Número 15.586"
              fill
              sizes="(max-width: 640px) 96px, (max-width: 768px) 144px, (max-width: 1024px) 160px, 176px"
              className="object-contain"
              priority
            />
          </div>
        </Link>
      </div>
    </div>
  );
}
