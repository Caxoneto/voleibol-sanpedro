'use client';

import { useState, useEffect } from 'react';
import { Pause, Play } from 'lucide-react';
import { CLUB_INFO } from '@/lib/club-info';
import { useStreaming } from '@/lib/use-streaming';
import { formatMadridDate } from '@/lib/date-utils';

export default function TopMarquee() {
  const { todayMatches, upcomingMatches, hydrated } = useStreaming();
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  const nextPending = hydrated ? todayMatches[0] || upcomingMatches[0] : undefined;

  let nextMatchText = 'TEMPORADA OFICIAL 2026 / 2027 EN MARCHA';
  if (nextPending) {
    let formattedDate = nextPending.dateStr;
    try {
      formattedDate = formatMadridDate(`${nextPending.dateStr}T12:00:00Z`, {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
      });
    } catch {
      formattedDate = nextPending.dateStr;
    }
    nextMatchText = `PRÓXIMO PARTIDO: ${nextPending.homeTeam} vs. ${nextPending.awayTeam} — ${formattedDate} ${nextPending.timeStr}h (${nextPending.venue})`;
  }

  const marqueeItems = [
    'YO VOLEY... ¿Y TÚ? ♡',
    nextMatchText,
    '¡VEN A ANIMAR A NUESTRA CANTERA Y PRIMER EQUIPO!',
    CLUB_INFO.motto.toUpperCase(),
    CLUB_INFO.socialHashtag.toUpperCase(),
  ];

  const effectivePaused = isPaused || prefersReducedMotion;

  return (
    <div
      className={`w-full bg-primary-container text-white py-1.5 relative shadow-[0px_4px_16px_rgba(217,4,41,0.4)] z-50 flex items-center ${
        effectivePaused ? 'marquee-paused' : ''
      }`}
    >
      <div className="flex-1 overflow-hidden flex items-center min-w-0">
        <div
          className={`flex items-center whitespace-nowrap cursor-default ${
            effectivePaused ? 'px-4 overflow-x-auto no-scrollbar' : 'animate-marquee-smooth'
          }`}
        >
          <div className="flex items-center gap-8 whitespace-nowrap font-label-md text-label-md tracking-widest uppercase pr-8 font-semibold">
            {marqueeItems.map((item, idx) => (
              <span key={`m1-${idx}`} className="inline-flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className={`inline-block w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#fff] ${
                    effectivePaused ? '' : 'animate-ping'
                  }`}
                />
                <span>{item}</span>
                <span className="text-white/80" aria-hidden="true">•</span>
              </span>
            ))}
          </div>
          {!effectivePaused && (
            <div
              aria-hidden="true"
              className="flex items-center gap-8 whitespace-nowrap font-label-md text-label-md tracking-widest uppercase pr-8 font-semibold"
            >
              {marqueeItems.map((item, idx) => (
                <span key={`m2-${idx}`} className="inline-flex items-center gap-3">
                  <span className="inline-block w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#fff] animate-ping" />
                  <span>{item}</span>
                  <span className="text-white/80">•</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Control accesible de pausa/reanudación (WCAG 2.2.2) */}
      <button
        type="button"
        onClick={() => setIsPaused((prev) => !prev)}
        aria-pressed={effectivePaused}
        aria-label={effectivePaused ? 'Reanudar cinta informativa' : 'Pausar cinta informativa'}
        title={effectivePaused ? 'Reanudar cinta informativa' : 'Pausar cinta informativa'}
        className="shrink-0 mr-2 sm:mr-3 w-7 h-7 flex items-center justify-center rounded-sm bg-black/35 hover:bg-black/55 border border-white/30 text-white transition-colors cursor-pointer"
      >
        {effectivePaused ? (
          <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
        ) : (
          <Pause className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
