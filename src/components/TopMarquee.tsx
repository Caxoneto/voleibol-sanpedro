'use client';

import { INITIAL_MATCHES } from '@/lib/data-store';
import { formatMadridDate, formatMadridTime } from '@/lib/date-utils';

export default function TopMarquee() {
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
    <div className="w-full bg-primary-container text-on-primary-container py-1.5 overflow-hidden relative shadow-[0px_4px_16px_rgba(217,4,41,0.4)] z-50">
      <div className="flex items-center whitespace-nowrap animate-marquee-smooth cursor-default">
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
    </div>
  );
}
