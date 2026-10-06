'use client';

export default function TopMarquee() {
  const marqueeItems = [
    'PRÓXIMO PARTIDO: C.D. Voleibol San Pedro vs. CV Costa del Sol — Sábado 18:30h en Pabellón Polideportivo Sergio Scariolo',
    '¡VEN A ANIMAR A NUESTRA CANTERA Y PRIMER EQUIPO!',
    'CLUB ADSCRITO A LA FEDERACIÓN ANDALUZA DE VOLEIBOL (FAVB)',
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
