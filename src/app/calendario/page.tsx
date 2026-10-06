'use client';

import { useState, useMemo } from 'react';
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
import jsPDF from 'jspdf';

export default function CalendarioPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [conditionFilter, setConditionFilter] = useState<'ALL' | 'LOCAL' | 'VISITANTE'>('ALL');
  const [showVenueModal, setShowVenueModal] = useState(false);

  // Filtrado de partidos
  const filteredMatches = useMemo(() => {
    return INITIAL_MATCHES.filter((match) => {
      // Filtrar por categoría
      if (selectedCategory !== 'ALL') {
        const team = INITIAL_TEAMS.find((t) => t.id === match.teamId);
        if (!team || team.categoryId !== selectedCategory) return false;
      }
      // Filtrar por condición
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
    const events = filteredMatches.map((m) =>
      generateIcsContent(
        `${m.homeTeamName} vs ${m.awayTeamName}`,
        m.venueName,
        m.matchDate,
        m.id
      )
    ).join('\n');

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
    doc.text('Federación Andaluza de Voleibol (FAVB) • Pabellón Polideportivo Sergio Scariolo', 15, 30);

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

      const fecha = `${formatMadridDate(m.matchDate, { day: '2-digit', month: '2-digit' })} ${formatMadridTime(m.matchDate)}h`;
      const versus = `${m.homeTeamName} vs ${m.awayTeamName}`;
      const sede = m.isClubHome ? 'Sergio Scariolo (LOCAL)' : m.venueName.substring(0, 24);

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
      `Generado el ${new Date().toLocaleDateString('es-ES')} desde www.cdvoleibolsanpedro.es`,
      15,
      285
    );

    doc.save('calendario-cd-voleibol-san-pedro.pdf');
  };

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Top Strip */}
      <section className="relative w-full bg-surface-container-lowest px-4 lg:px-8 py-12 border-b border-white/5 overflow-hidden">
        <div className="absolute -right-20 -top-24 w-96 h-96 rounded-full bg-primary-container/10 blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-primary-container text-white text-[11px] uppercase font-bold tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                TEMPORADA OFICIAL 2026 / 2027
              </span>
              <span className="text-xs text-tertiary uppercase tracking-wider">
                FAVB FEDERADO
              </span>
            </div>
            <h1 className="font-display-xl text-4xl sm:text-5xl lg:text-6xl uppercase text-white tracking-tight leading-none mt-1">
              CALENDARIO DE COMPETICIÓN
            </h1>
            <p className="font-body-md text-sm sm:text-base text-tertiary">
              Planificación de partidos oficiales de la FAVB disputados en el Pabellón Sergio Scariolo y a domicilio.
            </p>
          </div>

          {/* Quick Action Utilities */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleDownloadFullCalendarIcs}
              className="flex items-center gap-2 px-4 py-2.5 bg-surface-container-high hover:bg-surface-bright text-white text-xs uppercase tracking-wider font-bold transition-all shadow-md border border-white/10"
              title="Añadir todos los partidos a tu calendario de móvil (iPhone, Android, Outlook)"
            >
              <span className="material-symbols-outlined text-primary text-[18px]">smartphone</span>
              <span>Guardar en mi móvil</span>
            </button>

            <button
              onClick={handleExportPdf}
              className="flex items-center gap-2 px-4 py-2.5 bg-surface-container-high hover:bg-surface-bright text-white text-xs uppercase tracking-wider font-bold transition-all shadow-md border border-white/10"
              title="Descargar PDF imprimible del calendario"
            >
              <span className="material-symbols-outlined text-primary text-[18px]">picture_as_pdf</span>
              <span>Exportar PDF</span>
            </button>

            <button
              onClick={() => setShowVenueModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-container hover:bg-secondary-container text-white text-xs uppercase tracking-wider font-bold transition-all shadow-xl"
            >
              <span className="material-symbols-outlined text-[18px]">near_me</span>
              <span>Cómo llegar al Pabellón</span>
            </button>
          </div>
        </div>
      </section>

      {/* Filter Toolbar */}
      <section className="sticky top-28 z-30 bg-[#131313] border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                  conditionFilter === 'ALL' ? 'bg-white text-black' : 'text-tertiary hover:text-white'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setConditionFilter('LOCAL')}
                className={`px-2.5 py-1 text-xs font-bold uppercase ${
                  conditionFilter === 'LOCAL' ? 'bg-primary-container text-white' : 'text-tertiary hover:text-white'
                }`}
              >
                Local (Scariolo)
              </button>
              <button
                onClick={() => setConditionFilter('VISITANTE')}
                className={`px-2.5 py-1 text-xs font-bold uppercase ${
                  conditionFilter === 'VISITANTE' ? 'bg-white text-black' : 'text-tertiary hover:text-white'
                }`}
              >
                Visitante
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Listado de Partidos */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        <div className="mb-4 flex items-center justify-between text-xs text-tertiary">
          <span>Mostrando {filteredMatches.length} partidos oficiales programados</span>
          <span className="text-primary font-bold">Pabellón Polideportivo Sergio Scariolo</span>
        </div>

        <div className="flex flex-col gap-4">
          {filteredMatches.length === 0 ? (
            <div className="bg-surface-container-low border border-white/5 p-12 text-center">
              <p className="text-sm text-tertiary">No hay partidos con los filtros seleccionados.</p>
            </div>
          ) : (
            filteredMatches.map((match) => {
              const team = INITIAL_TEAMS.find((t) => t.id === match.teamId);
              const googleCalUrl = generateGoogleCalendarUrl(
                `Voleibol: ${match.homeTeamName} vs ${match.awayTeamName}`,
                match.venueName,
                match.matchDate
              );

              return (
                <div
                  key={match.id}
                  className={`bg-surface-container-low border p-5 transition-all hover:border-primary-container/60 ${
                    match.isClubHome
                      ? 'border-l-4 border-l-primary-container border-white/5'
                      : 'border-white/5'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Left: Round & Date */}
                    <div className="flex items-center gap-4 lg:w-64 shrink-0">
                      <div className="w-14 h-14 bg-surface-container-high flex flex-col items-center justify-center border border-white/5 shrink-0">
                        <span className="font-display-xl text-xl text-primary leading-none">
                          J{match.round}
                        </span>
                        <span className="text-[9px] uppercase tracking-wider text-tertiary">
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
                        <span className="font-display-xl text-2xl text-primary leading-none mt-0.5">
                          {formatMadridTime(match.matchDate)}h
                        </span>
                        <span className="text-[10px] text-tertiary uppercase mt-1">
                          {team?.name || 'Oficial FAVB'}
                        </span>
                      </div>
                    </div>

                    {/* Middle: Matchup & Venue */}
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-headline-sm text-base uppercase font-bold ${
                              match.isClubHome ? 'text-primary' : 'text-white'
                            }`}
                          >
                            {match.homeTeamName}
                          </span>
                          <span className="text-xs text-tertiary">vs</span>
                          <span
                            className={`font-headline-sm text-base uppercase font-bold ${
                              !match.isClubHome ? 'text-primary' : 'text-white'
                            }`}
                          >
                            {match.awayTeamName}
                          </span>
                        </div>

                        {match.isClubHome ? (
                          <span className="inline-flex self-start sm:self-auto px-2 py-0.5 bg-primary-container/20 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary-container/30">
                            En Casa
                          </span>
                        ) : (
                          <span className="inline-flex self-start sm:self-auto px-2 py-0.5 bg-surface-container-high text-tertiary text-[10px] uppercase font-bold">
                            A Domicilio
                          </span>
                        )}
                      </div>

                      {/* Venue */}
                      <div className="flex items-center gap-1.5 text-xs text-tertiary mt-2">
                        <span className="material-symbols-outlined text-[16px] text-primary">
                          pin_drop
                        </span>
                        <span>{match.venueName}</span>
                      </div>
                    </div>

                    {/* Right: Actions (Rediseñados y Claros) */}
                    <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                      {/* Botón Google Calendar Mejorado */}
                      <a
                        href={googleCalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 bg-surface-container-highest hover:bg-surface-bright text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all border border-white/10 hover:border-primary-container"
                        title="Abrir y guardar este partido en Google Calendar"
                      >
                        <span className="material-symbols-outlined text-[17px] text-primary">
                          event
                        </span>
                        <span>Google Calendar</span>
                      </a>

                      {/* Botón Coloquial para Móvil (sustituye al críptico .ICS) */}
                      <button
                        onClick={() => handleDownloadIcs(match)}
                        className="px-3.5 py-2 bg-surface-container-highest hover:bg-surface-bright text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all border border-white/10 hover:border-primary-container"
                        title="Añadir cita a la agenda de tu móvil (Apple Calendar, Android, etc.)"
                      >
                        <span className="material-symbols-outlined text-[17px] text-primary">
                          smartphone
                        </span>
                        <span>Añadir a mi móvil</span>
                      </button>

                      {match.isClubHome && (
                        <button
                          onClick={() => setShowVenueModal(true)}
                          className="px-3.5 py-2 bg-primary-container hover:bg-secondary-container text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow"
                        >
                          <span className="material-symbols-outlined text-[16px]">directions</span>
                          <span>Ubicación</span>
                        </button>
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
        <div id="pabellon" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
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
                <strong className="text-white">Aparcamiento:</strong> Amplia explanada exterior en la zona deportiva de Fuente Nueva.
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
