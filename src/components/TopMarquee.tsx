'use client';

import { useState } from 'react';
import { INITIAL_MATCHES } from '@/lib/data-store';
import { formatMadridDate, formatMadridTime } from '@/lib/date-utils';

export default function TopMarquee() {
  const [isPaused, setIsPaused] = useState(false);

  const nextPending = INITIAL_MATCHES.filter((m) => m.status !== 'FINISHED').sort(
    (a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
  )[0];

  const nextMatchText = nextPending
    ? `PRÓXIMO PARTIDO: ${nextPending.homeTeamName} vs. ${nextPending.awayTeamName} — ${formatMadridDate(
        nextPending.matchDate,
        { weekday: 'long', day: 'numeric', month: 'short' }
      )} ${formatMadridTime(nextPending.matchDate)}h (${nextPending.venueName})`
    : 'TEMPORADA OFICIAL 2026 / 2027 EN MARCHA';

  const marqueeItems = [
    'YO VOLEY... ¿Y TÚ? ♡',
    nextMatchText,
    '¡VEN A ANIMAR A NUESTRA CANTERA Y PRIMER EQUIPO!',
    'PASIÓN, CANTERA Y ORGULLO SAMPEDREÑO',
    '#VOLEIBOLSAMPEDRO',
  ];

  return (
    <div className="w-full bg-primary-container text-on-primary-container py-1.5 overflow-hidden relative shadow-[0px_4px_16px_rgba(217,4,41,0.4)] z-50 flex items-center">
      <div
        className={`flex items-center whitespace-nowrap animate-marquee-smooth cursor-default focus-within:[animation-play-state:paused] ${
          isPaused ? '[animation-play-state:paused]' : ''
        }`}
        style={isPaused ? { animationPlayState: 'paused' } : undefined}
      >
        <div className="flex items-center gap-8 whitespace-nowrap font-label-md text-label-md tracking-widest uppercase pr-8 font-semibold">
          {marqueeItems.map((item, idx) => (
            <span key={`m1-${idx}`} className="inline-flex items-center gap-3">
              <span className="inline-block w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#fff] animate-ping" />
              <span>{item}</span>
              <span className="text-on-primary-container/60">•</span>
            </span>
          ))}
        </div>
        <div aria-hidden="true" className="flex items-center gap-8 whitespace-nowrap font-label-md text-label-md tracking-widest uppercase pr-8 font-semibold">
          {marqueeItems.map((item, idx) => (
            <span key={`m2-${idx}`} className="inline-flex items-center gap-3">
              <span className="inline-block w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#fff] animate-ping" />
              <span>{item}</span>
              <span className="text-on-primary-container/60">•</span>
            </span>
          ))}
        </div>
      </div>

      {/* Control accesible de pausa/reanudación (WCAG 2.2.2 Pause, Stop, Hide) */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center bg-primary-container/90 backdrop-blur-xs px-1 rounded shadow-sm">
        <button
          type="button"
          onClick={() => setIsPaused(!isPaused)}
          aria-label={isPaused ? 'Reanudar avisos en movimiento' : 'Pausar avisos en movimiento'}
          title={isPaused ? 'Reanudar' : 'Pausar'}
          className="text-white hover:text-white/80 p-0.5 rounded transition-colors flex items-center justify-center focus-visible:outline-white"
        >
          <span className="material-symbols-outlined text-[16px] leading-none" aria-hidden="true">
            {isPaused ? 'play_arrow' : 'pause'}
          </span>
        </button>
      </div>
    </div>
  );
}
