'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  INITIAL_CATEGORIES,
  INITIAL_TEAMS,
  INITIAL_MATCHES,
  CLUB_INFO,
} from '@/lib/data-store';
import { Match } from '@/lib/types';
import {
  formatMadridDate,
  formatMadridTime,
  generateGoogleCalendarUrl,
  generateIcsContent,
} from '@/lib/date-utils';
import { getTeamLogo } from '@/lib/team-logos';
import jsPDF from 'jspdf';

export default function CalendarioPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [conditionFilter, setConditionFilter] = useState<'ALL' | 'LOCAL' | 'VISITANTE'>('ALL');
  const [showVenueModal, setShowVenueModal] = useState(false);

  // Filtrado de partidos
  const filteredMatches = useMemo(() => {
    return INITIAL_MATCHES.filter((match) => {
      if (selectedCategory !== 'ALL') {
        const team = INITIAL_TEAMS.find((t) => t.id === match.teamId);
        if (!team || team.categoryId !== selectedCategory) return false;
      }
      if (conditionFilter === 'LOCAL' && !match.isClubHome) return false;
      if (conditionFilter === 'VISITANTE' && match.isClubHome) return false;

      return true;
    }).sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
  }, [selectedCategory, conditionFilter]);

  // Descargar archivo compatible con móviles (iCal)
  const handleDownloadIcs = (match: Match) => {
    const icsString = generateIcsContent(
      `${match.homeTeamName} vs ${match.awayTeamName}`,
      match.venueName,
      match.matchDate,
      match.id
    );
    const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `partido-san-pedro-j${match.round}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Descargar calendario completo para el móvil
  const handleDownloadFullCalendarIcs = () => {
    const events = filteredMatches
      .map((m) =>
        generateIcsContent(
          `${m.homeTeamName} vs ${m.awayTeamName}`,
          m.venueName,
          m.matchDate,
          m.id
        )
      )
      .join('\n');

    const blob = new Blob([events], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `calendario-cd-voleibol-san-pedro.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Exportar calendario en PDF oficial
  const handleExportPdf = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Fondo y cabecera
    doc.setFillColor(19, 19, 19);
    doc.rect(0, 0, 210, 35, 'F');

    doc.setTextColor(217, 4, 41);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('C.D. VOLEIBOL SAN PEDRO', 15, 16);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('CALENDARIO OFICIAL DE COMPETICIÓN • TEMPORADA 2026 / 2027', 15, 24);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(
      'Federación Andaluza de Voleibol (FAVB) • Pabellón Polideportivo Sergio Scariolo',
      15,
      30
    );

    // Tabla de Partidos
    let y = 46;
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('JORNADA', 15, y);
    doc.text('FECHA Y HORA', 40, y);
    doc.text('ENFRENTAMIENTO', 85, y);
    doc.text('SEDE', 155, y);

    doc.setDrawColor(217, 4, 41);
    doc.setLineWidth(0.5);
    doc.line(15, y + 2, 195, y + 2);
    y += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    filteredMatches.forEach((m) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      const fecha = `${formatMadridDate(m.matchDate, {
        day: '2-digit',
        month: '2-digit',
      })} ${formatMadridTime(m.matchDate)}h`;
      const versus = `${m.homeTeamName} vs ${m.awayTeamName}`;
      const sede = m.isClubHome ? 'Sergio Scariolo (LOCAL)' : m.venueName.substring(0, 28);

      if (m.isClubHome) {
        doc.setFillColor(254, 242, 242);
        doc.rect(14, y - 4, 182, 7, 'F');
      }

      doc.setTextColor(30, 30, 30);
      doc.text(`Jor. ${m.round}`, 15, y);
      doc.text(fecha, 40, y);
      doc.text(versus, 85, y);
      doc.text(sede, 155, y);

      y += 8;
    });

    // Pie de página
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(
      `Generado el ${new Date().toLocaleDateString('es-ES')} desde www.voleibolsanpedro.com`,
      15,
      285
    );

    doc.save('calendario-cd-voleibol-san-pedro.pdf');
  };

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Top Strip */}
      <section className="relative w-full bg-surface-container-lowest px-4 lg:px-8 py-8 sm:py-10 border-b border-white/5 overflow-hidden">
        <div className="absolute -right-20 -top-24 w-96 h-96 rounded-full bg-primary-container/10 blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 flex items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5 max-w-3xl min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-primary-container text-white text-[10px] sm:text-[11px] uppercase font-bold tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                TEMPORADA OFICIAL 2026 / 2027
              </span>
              <span className="text-xs text-tertiary uppercase tracking-wider">
                FAVB FEDERADO
              </span>
            </div>
            <h1 className="font-display-xl text-3xl sm:text-5xl lg:text-6xl uppercase text-white tracking-tight leading-none mt-1">
              CALENDARIO DE COMPETICIÓN
            </h1>
            <p className="font-body-md text-xs sm:text-base text-tertiary">
              Planificación de partidos oficiales de la FAVB en el Pabellón Sergio Scariolo y pabellones visitantes.
            </p>
          </div>

          {/* Quick Action Utilities: Compact Icon-Only Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadFullCalendarIcs}
              className="w-9 h-9 flex items-center justify-center bg-surface-container-high hover:bg-surface-bright text-white transition-all shadow-md border border-white/10 hover:border-primary-container"
              title="Guardar calendario completo en mi móvil (iPhone, Android, Outlook)"
              aria-label="Guardar calendario en mi móvil"
            >
              <span className="material-symbols-outlined text-primary text-[18px]">
                smartphone
              </span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="w-9 h-9 flex items-center justify-center bg-surface-container-high hover:bg-surface-bright text-white transition-all shadow-md border border-white/10 hover:border-primary-container"
              title="Exportar calendario en PDF imprimible"
              aria-label="Exportar PDF"
            >
              <span className="material-symbols-outlined text-primary text-[18px]">
                picture_as_pdf
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowVenueModal(true)}
              className="w-9 h-9 flex items-center justify-center bg-primary-container hover:bg-secondary-container text-white transition-all shadow-xl border border-white/15"
              title="Cómo llegar al Pabellón Polideportivo Sergio Scariolo"
              aria-label="Cómo llegar al Pabellón"
            >
              <span className="material-symbols-outlined text-[18px]">near_me</span>
            </button>
          </div>
        </div>
      </section>

      {/* Filter Toolbar */}
      <section className="sticky top-28 z-30 bg-[#131313] border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Categorías */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                selectedCategory === 'ALL'
                  ? 'bg-primary-container text-white'
                  : 'bg-surface-container-high text-tertiary hover:text-white'
              }`}
            >
              Todas las categorías
            </button>
            {INITIAL_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-primary-container text-white'
                    : 'bg-surface-container-high text-tertiary hover:text-white'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Condición */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center bg-surface-container-high p-0.5 border border-white/5">
              <button
                onClick={() => setConditionFilter('ALL')}
                className={`px-2.5 py-1 text-xs font-bold uppercase ${
                  conditionFilter === 'ALL'
                    ? 'bg-white text-black'
                    : 'text-tertiary hover:text-white'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setConditionFilter('LOCAL')}
                className={`px-2.5 py-1 text-xs font-bold uppercase ${
                  conditionFilter === 'LOCAL'
                    ? 'bg-primary-container text-white'
                    : 'text-tertiary hover:text-white'
                }`}
              >
                Local (Scariolo)
              </button>
              <button
                onClick={() => setConditionFilter('VISITANTE')}
                className={`px-2.5 py-1 text-xs font-bold uppercase ${
                  conditionFilter === 'VISITANTE'
                    ? 'bg-white text-black'
                    : 'text-tertiary hover:text-white'
                }`}
              >
                Visitante
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Listado de Partidos */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 sm:py-8">
        <div className="mb-4 flex items-center justify-between text-xs text-tertiary">
          <span>Mostrando {filteredMatches.length} partidos oficiales programados</span>
          <span className="text-primary font-bold hidden sm:inline">
            Pabellón Polideportivo Sergio Scariolo y sedes FAVB
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {filteredMatches.length === 0 ? (
            <div className="bg-surface-container-low border border-white/5 p-12 text-center">
              <p className="text-sm text-tertiary">
                No hay partidos con los filtros seleccionados.
              </p>
            </div>
          ) : (
            filteredMatches.map((match) => {
              const team = INITIAL_TEAMS.find((t) => t.id === match.teamId);
              const googleCalUrl = generateGoogleCalendarUrl(
                `Voleibol: ${match.homeTeamName} vs ${match.awayTeamName}`,
                match.venueName,
                match.matchDate
              );
              const mapsUrl = match.isClubHome
                ? CLUB_INFO.venueMapsUrl
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    match.venueName
                  )}`;

              return (
                <div
                  key={match.id}
                  className={`bg-surface-container-low border p-3.5 sm:p-4 transition-all hover:border-primary-container/60 ${
                    match.isClubHome
                      ? 'border-l-4 border-l-primary-container border-white/5'
                      : 'border-white/5'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-5">
                    {/* Top/Left: Round, Date & Mobile Quick Icons */}
                    <div className="flex items-center justify-between lg:justify-start gap-3 lg:w-64 shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-surface-container-high flex flex-col items-center justify-center border border-white/5 shrink-0">
                          <span className="font-display-xl text-lg text-primary leading-none">
                            J{match.round}
                          </span>
                          <span className="text-[8px] uppercase tracking-wider text-tertiary">
                            Jornada
                          </span>
                        </div>

                        <div className="flex flex-col">
                          <span className="text-xs uppercase font-bold text-white">
                            {formatMadridDate(match.matchDate, {
                              weekday: 'short',
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                          <span className="font-display-xl text-xl text-primary leading-none mt-0.5">
                            {formatMadridTime(match.matchDate)}h
                          </span>
                          <span className="text-[10px] text-tertiary uppercase mt-0.5">
                            {team?.name || 'Oficial FAVB'}
                          </span>
                        </div>
                      </div>

                      {/* Iconos compactos en móvil a la derecha de la cabecera */}
                      <div className="flex lg:hidden items-center gap-1.5 shrink-0">
                        <span
                          className={`w-7 h-7 flex items-center justify-center border ${
                            match.isClubHome
                              ? 'bg-primary-container/20 text-primary border-primary-container/30'
                              : 'bg-white/5 text-tertiary border-white/10'
                          }`}
                          title={
                            match.isClubHome
                              ? 'Partido en casa (Pabellón Sergio Scariolo)'
                              : `Partido fuera (${match.venueName})`
                          }
                        >
                          <span className="material-symbols-outlined text-[15px]">
                            {match.isClubHome ? 'home' : 'flight'}
                          </span>
                        </span>

                        <a
                          href={googleCalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-7 h-7 bg-surface-container-highest hover:bg-surface-bright text-white flex items-center justify-center transition-all border border-white/10 hover:border-primary-container"
                          title="Guardar en Google Calendar"
                          aria-label="Google Calendar"
                        >
                          <span className="material-symbols-outlined text-[15px] text-primary">
                            event
                          </span>
                        </a>

                        <button
                          type="button"
                          onClick={() => handleDownloadIcs(match)}
                          className="w-7 h-7 bg-surface-container-highest hover:bg-surface-bright text-white flex items-center justify-center transition-all border border-white/10 hover:border-primary-container"
                          title="Añadir a la agenda del móvil (.ics)"
                          aria-label="Añadir al móvil"
                        >
                          <span className="material-symbols-outlined text-[15px] text-primary">
                            smartphone
                          </span>
                        </button>

                        {match.isClubHome ? (
                          <button
                            type="button"
                            onClick={() => setShowVenueModal(true)}
                            className="w-7 h-7 bg-primary-container hover:bg-secondary-container text-white flex items-center justify-center transition-colors shadow"
                            title="Ver ubicación del Pabellón Sergio Scariolo"
                            aria-label="Ubicación"
                          >
                            <span className="material-symbols-outlined text-[15px]">
                              directions
                            </span>
                          </button>
                        ) : (
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-7 h-7 bg-surface-container-highest hover:bg-primary-container text-tertiary hover:text-white flex items-center justify-center transition-colors border border-white/10"
                            title={`Cómo llegar a ${match.venueName}`}
                            aria-label="Cómo llegar al pabellón visitante"
                          >
                            <span className="material-symbols-outlined text-[15px]">
                              directions
                            </span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Middle: Matchup & Venue */}
                    <div className="flex-1 flex flex-col justify-center min-w-0">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Image
                            src={getTeamLogo(match.homeTeamName)}
                            alt={match.homeTeamName}
                            width={24}
                            height={24}
                            className="w-6 h-6 object-contain shrink-0"
                          />
                          <span
                            className={`font-headline-sm text-sm sm:text-base uppercase font-bold truncate ${
                              match.isClubHome ? 'text-primary' : 'text-white'
                            }`}
                          >
                            {match.homeTeamName}
                          </span>
                        </div>

                        <span className="text-xs text-tertiary font-mono">vs</span>

                        <div className="flex items-center gap-2 min-w-0">
                          <Image
                            src={getTeamLogo(match.awayTeamName)}
                            alt={match.awayTeamName}
                            width={24}
                            height={24}
                            className="w-6 h-6 object-contain shrink-0"
                          />
                          <span
                            className={`font-headline-sm text-sm sm:text-base uppercase font-bold truncate ${
                              !match.isClubHome ? 'text-primary' : 'text-white'
                            }`}
                          >
                            {match.awayTeamName}
                          </span>
                        </div>
                      </div>

                      {/* Venue */}
                      <div className="flex items-center gap-1.5 text-xs text-tertiary mt-1.5">
                        <span className="material-symbols-outlined text-[15px] text-primary shrink-0">
                          pin_drop
                        </span>
                        <span className="truncate">{match.venueName}</span>
                      </div>
                    </div>

                    {/* Right (Desktop): Compact Icon-Only Actions */}
                    <div className="hidden lg:flex items-center gap-2 shrink-0">
                      <span
                        className={`w-8 h-8 flex items-center justify-center border ${
                          match.isClubHome
                            ? 'bg-primary-container/20 text-primary border-primary-container/30'
                            : 'bg-white/5 text-tertiary border-white/10'
                        }`}
                        title={
                          match.isClubHome
                            ? 'Partido en casa (Pabellón Sergio Scariolo)'
                            : `Partido fuera (${match.venueName})`
                        }
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {match.isClubHome ? 'home' : 'flight'}
                        </span>
                      </span>

                      <a
                        href={googleCalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 bg-surface-container-highest hover:bg-surface-bright text-white flex items-center justify-center transition-all border border-white/10 hover:border-primary-container"
                        title="Abrir y guardar este partido en Google Calendar"
                        aria-label="Google Calendar"
                      >
                        <span className="material-symbols-outlined text-[16px] text-primary">
                          event
                        </span>
                      </a>

                      <button
                        type="button"
                        onClick={() => handleDownloadIcs(match)}
                        className="w-8 h-8 bg-surface-container-highest hover:bg-surface-bright text-white flex items-center justify-center transition-all border border-white/10 hover:border-primary-container"
                        title="Añadir cita a la agenda de tu móvil (Apple Calendar, Android, etc.)"
                        aria-label="Añadir a mi móvil"
                      >
                        <span className="material-symbols-outlined text-[16px] text-primary">
                          smartphone
                        </span>
                      </button>

                      {match.isClubHome ? (
                        <button
                          type="button"
                          onClick={() => setShowVenueModal(true)}
                          className="w-8 h-8 bg-primary-container hover:bg-secondary-container text-white flex items-center justify-center transition-colors shadow"
                          title="Ubicación del Pabellón Sergio Scariolo"
                          aria-label="Ubicación"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            directions
                          </span>
                        </button>
                      ) : (
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-8 h-8 bg-surface-container-highest hover:bg-primary-container text-tertiary hover:text-white flex items-center justify-center transition-colors border border-white/10"
                          title={`Cómo llegar a ${match.venueName} en Google Maps`}
                          aria-label="Cómo llegar al pabellón visitante"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            directions
                          </span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal: Cómo llegar al Pabellón Sergio Scariolo */}
      {showVenueModal && (
        <div
          id="pabellon"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
        >
          <div className="bg-surface-container-lowest border-2 border-primary-container p-6 sm:p-8 max-w-xl w-full shadow-2xl relative">
            <button
              onClick={() => setShowVenueModal(false)}
              className="absolute top-4 right-4 text-tertiary hover:text-white"
            >
              <span className="material-symbols-outlined text-[24px]">close</span>
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary-container text-white flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">stadium</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-widest text-primary font-bold block">
                  Sede Oficial de Juego
                </span>
                <h3 className="font-display-xl text-xl sm:text-2xl uppercase text-white">
                  Pabellón Sergio Scariolo
                </h3>
              </div>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-tertiary">
              <p>
                <strong className="text-white">Dirección:</strong> {CLUB_INFO.venueAddress}
              </p>
              <p>
                <strong className="text-white">Instalaciones:</strong> Gradas abiertas para aficionados y familias sampedreñas.
              </p>
              <p>
                <strong className="text-white">Aparcamiento:</strong> Amplia explanada exterior en la zona deportiva del Ensanche Sur.
              </p>

              <div className="p-3 bg-surface-container-high border-l-4 border-emerald-500 text-white font-semibold text-xs">
                ¡Ven en familia y con amigos a animar al voleibol de nuestro pueblo!
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
              <a
                href={CLUB_INFO.venueMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto flex-1 text-center py-3 px-4 bg-primary-container hover:bg-secondary-container text-white font-label-md text-xs uppercase tracking-wider font-bold shadow-md flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                Abrir en Google Maps
              </a>
              <button
                onClick={() => setShowVenueModal(false)}
                className="w-full sm:w-auto py-3 px-6 bg-surface-container-high text-on-surface font-label-md text-xs uppercase tracking-wider hover:bg-surface-bright"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
