'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useStreaming, isValidYouTubeUrl } from '@/lib/use-streaming';

export default function HeroLiveBlock() {
  const { status: streamingStatus, hydrated } = useStreaming();
  const isLive = hydrated && streamingStatus.active && !!streamingStatus.url && isValidYouTubeUrl(streamingStatus.url);

  return (
    <div
      className={`flex flex-row items-center justify-between sm:justify-end ${
        isLive ? 'gap-1.5 sm:gap-4 lg:gap-6' : 'gap-2.5 sm:gap-5 lg:gap-6'
      } self-start md:self-center shrink-0 w-full md:w-auto transition-all`}
    >
      {/* Emblema / Lema Oficial de la Temporada: "Yo Voley... ¿y tú?" (SVG inline sin fuente web externa) */}
      <div
        className={`shrink-0 select-none -rotate-6 transform transition-all duration-300 hover:-rotate-3 ${
          isLive
            ? 'px-1 sm:px-3 py-0.5 max-w-[84px] sm:max-w-none'
            : 'px-2 sm:px-3 py-1'
        }`}
      >
        <svg
          viewBox="0 0 260 156"
          role="img"
          aria-label="Lema oficial: Yo Voley... ¿y tú?"
          className={`overflow-visible drop-shadow-[0_4px_12px_rgba(0,0,0,0.85)] transition-all ${
            isLive
              ? 'w-20 sm:w-40 md:w-48 lg:w-56 h-auto'
              : 'w-40 sm:w-52 lg:w-64 h-auto'
          }`}
        >
          <text
            x="130"
            y="42"
            textAnchor="middle"
            fill="#ffffff"
            fontFamily="Georgia, 'Times New Roman', serif"
            fontStyle="italic"
            fontWeight="700"
            fontSize="40"
            letterSpacing="0.5"
          >
            Yo Voley...
          </text>

          {/* Trazo de pincel rojo intenso debajo de Yo Voley... */}
          <path
            d="M14 58 C 78 50, 165 46, 246 44"
            stroke="#e10600"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M24 63 C 88 56, 175 52, 236 49"
            stroke="#b80000"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
            opacity="0.88"
          />

          <text
            x="130"
            y="108"
            textAnchor="middle"
            fill="#ff1111"
            fontFamily="Georgia, 'Times New Roman', serif"
            fontStyle="italic"
            fontWeight="700"
            fontSize="50"
            letterSpacing="0.5"
          >
            ¿y tú?
          </text>

          {/* Corazón dibujado a mano en trazo blanco debajo */}
          <path
            d="M126 150 C 123 145, 111 136, 112 126 C 112.8 120, 118.5 118.5, 122.5 123.5 C 124.2 125.6, 125.4 128.2, 126 130 C 126.8 126.5, 129.5 119.5, 135 119.5 C 140 119.5, 142.5 124.5, 141 130.5 C 139 138.5, 129.5 146, 126 150 Z"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>

      {/* Botón oficial de YouTube En Directo! (Aparece cuando el streaming está activo) */}
      {isLive && streamingStatus.url && isValidYouTubeUrl(streamingStatus.url) && (
        <div className="shrink-0 flex items-center animate-fade-in">
          <a
            href={streamingStatus.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Ver partido en directo en YouTube (Abre en ventana nueva)"
            aria-label="Ver streaming oficial en YouTube (En directo, abre en una nueva pestaña)"
            className="group relative flex items-center gap-2 sm:gap-3 px-2.5 py-1.5 sm:px-4 sm:py-2.5 bg-gradient-to-r from-[#b80022] via-primary-container to-[#9e021d] hover:from-primary-container hover:to-[#b80022] text-white font-headline font-black uppercase tracking-wider rounded-none border-2 border-red-300 shadow-[0_0_20px_rgba(239,68,68,0.6)] hover:shadow-[0_0_32px_rgba(239,68,68,0.85)] hover:scale-105 active:translate-x-[1px] active:translate-y-[1px] transition-all duration-200 cursor-pointer"
          >
            {/* Icono oficial de YouTube */}
            <div className="w-5 h-5 sm:w-7 sm:h-7 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
              <svg className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px] text-[#ff0000] fill-current" viewBox="0 0 24 24" aria-hidden="true">
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
              <span className="text-[10px] text-white/95 font-mono font-medium tracking-normal mt-0.5 whitespace-nowrap">
                YouTube Live ↗
              </span>
            </div>
          </a>
        </div>
      )}

      {/* Promoción Lotería de Navidad 2026 - Animación de escala GPU */}
      <div className="shrink-0 flex flex-col items-center pt-3 sm:pt-5 pb-1 sm:pb-2">
        <Link
          href="/noticias/loteria-navidad-2026-voleibol-san-pedro-15586"
          aria-label="Lotería · 15.586 — Décimo de Lotería de Navidad 2026 del C.D. Voleibol San Pedro"
          title="Lotería de Navidad 2026: Número 15.586 - C.D. Voleibol San Pedro (Haz clic para ver cómo adquirir décimos)"
          className="group relative flex flex-col items-center cursor-pointer select-none"
        >
          {/* Etiqueta / Pill promocional festiva */}
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 px-2 py-0.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black font-headline font-black text-[10px] uppercase tracking-wider rounded-full shadow-[0_2px_10px_rgba(245,158,11,0.55)] whitespace-nowrap transition-transform duration-200 group-hover:scale-105 pointer-events-none border border-amber-100/70">
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
