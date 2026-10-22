import Link from 'next/link';
import Image from 'next/image';
import { store, CLUB_INFO } from '@/lib/data-store';
import { syncFavbData } from '@/lib/favb-scraper';
import { formatMadridDate, formatMadridDateString, formatMadridTime } from '@/lib/date-utils';
import { calculateMatchScore } from '@/lib/volleyball-rules';
import { getTeamLogo } from '@/lib/team-logos';
import SponsorBanner from '@/components/SponsorBanner';
import HeroMatchesCarousel, { HeroCarouselMatchItem } from '@/components/HeroMatchesCarousel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const syncedData = await syncFavbData();
  const liveMap = new Map(syncedData.matches.map((m) => [m.id, m]));

  const articles = store.getArticles().slice(0, 3);
  const categories = store.getCategories();
  const teams = store.getTeams();

  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const todayStr = formatMadridDateString(new Date());

  const matches = store.getMatches().map((m) => {
    const live = liveMap.get(m.id);
    if (!live) return m;
    return {
      ...m,
      homeTeamName: live.homeTeam || m.homeTeamName,
      awayTeamName: live.awayTeam || m.awayTeamName,
      isClubHome: live.isClubHome ?? m.isClubHome,
      matchDate: live.matchDate || m.matchDate,
      venueName: live.venue || m.venueName,
      status: live.status,
      homeScore: live.homeScore ?? m.homeScore,
      awayScore: live.awayScore ?? m.awayScore,
      setScores: live.setScores && live.setScores.length > 0 ? live.setScores : m.setScores,
      currentSetScore: live.currentSetScore,
    };
  });

  // Seleccionar el partido destacado entre los partidos EN JUEGO (LIVE) o el PRÓXIMO pendiente (SCHEDULED) más cercano
  const pendingMatches = matches
    .filter((m) => m.status === 'LIVE' || m.status === 'SCHEDULED')
    .sort((a, b) => {
      if (a.status === 'LIVE' && b.status !== 'LIVE') return -1;
      if (b.status === 'LIVE' && a.status !== 'LIVE') return 1;
      const diff = new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime();
      if (diff !== 0) return diff;
      const catA = catMap.get(teamMap.get(a.teamId)?.categoryId || '')?.order ?? 99;
      const catB = catMap.get(teamMap.get(b.teamId)?.categoryId || '')?.order ?? 99;
      return catA - catB;
    });

  const featuredMatch = pendingMatches[0];
  const featuredTeam = featuredMatch ? teamMap.get(featuredMatch.teamId) : undefined;
  const featuredCat = featuredTeam ? catMap.get(featuredTeam.categoryId) : undefined;

  const recentMatches = matches
    .filter((m) => m.status === 'FINISHED')
    .sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime())
    .slice(0, 3);

  const carouselMatches: HeroCarouselMatchItem[] = matches.map((m) => {
    const team = teamMap.get(m.teamId);
    const cat = team ? catMap.get(team.categoryId) : undefined;
    return {
      id: m.id,
      round: m.round,
      categoryId: cat?.id || 'cat-senior-fem',
      categoryName: cat?.name || 'Categoría FAVB',
      categoryOrder: cat?.order ?? 99,
      homeTeamName: m.homeTeamName,
      awayTeamName: m.awayTeamName,
      isClubHome: m.isClubHome,
      matchDate: m.matchDate,
      dateStr: formatMadridDateString(m.matchDate),
      status: m.status,
      homeScore: 'homeScore' in m ? (m.homeScore as number | undefined) : undefined,
      awayScore: 'awayScore' in m ? (m.awayScore as number | undefined) : undefined,
      setScores: m.setScores,
      currentSetScore:
        'currentSetScore' in m
          ? (m.currentSetScore as { set: string; home: number; away: number } | undefined)
          : undefined,
    };
  });

  return (
    <div className="w-full flex flex-col">
      {/* Hero Section */}
      <section className="relative w-full overflow-hidden bg-surface-container-lowest pt-2 pb-6 sm:pt-4 sm:pb-8 flex flex-col justify-start">
        {/* Background Image with Ambient Zoom */}
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center mix-blend-luminosity opacity-40 animate-hero-bg transition-transform duration-1000"
          style={{ backgroundImage: "url('/images/hero-spike.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-transparent" />

        {/* Stadium Crimson Aura */}
        <div className="absolute -top-32 left-1/4 w-96 h-96 bg-primary-container/25 rounded-full blur-[140px] pointer-events-none animate-pulse-aura" />

        <div className="relative max-w-7xl mx-auto px-4 lg:px-8 pt-2 pb-2 sm:pt-3 sm:pb-4 flex flex-col justify-start w-full">
          {/* Cabecera Hero + Emblema Oficial "Yo Voley... ¿y tú?" */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
            <div className="max-w-3xl">
              <h1 className="font-display-xl text-[2.1rem] sm:text-5xl lg:text-6xl xl:text-7xl tracking-tight text-on-surface uppercase leading-[0.95]">
                PASIÓN, CANTERA <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container via-red-500 to-secondary-fixed-dim">
                  Y ORGULLO SAMPEDREÑO.
                </span>
              </h1>
            </div>

            {/* Emblema / Lema Oficial de la Temporada: "Yo Voley... ¿y tú?" (Recreación fiel de RRSS) */}
            <div
              className="self-start md:self-center shrink-0 select-none px-4 py-1 sm:px-6 sm:py-3 -rotate-6 transform transition-transform duration-300 hover:-rotate-3"
              aria-label="Lema oficial: Yo Voley... ¿y tú?"
            >
              <div
                className="flex flex-col items-center leading-none"
                style={{ fontFamily: 'var(--font-brush), cursive' }}
              >
                {/* Línea superior blanca: Yo Voley... */}
                <span className="text-white text-3xl sm:text-4xl lg:text-5xl tracking-wide drop-shadow-[0_3px_10px_rgba(0,0,0,0.9)]">
                  Yo Voley...
                </span>

                {/* Trazo de pincel rojo intenso debajo de Yo Voley... */}
                <svg
                  viewBox="0 0 240 22"
                  className="w-40 sm:w-52 lg:w-60 h-4 sm:h-5 -my-1 overflow-visible"
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
                <span className="text-[#ff1111] text-4xl sm:text-5xl lg:text-6xl tracking-wide -mt-1 drop-shadow-[0_3px_12px_rgba(225,6,0,0.45)]">
                  ¿y tú?
                </span>

                {/* Corazón dibujado a mano en trazo blanco debajo */}
                <svg
                  viewBox="0 0 44 42"
                  className="w-6 h-6 sm:w-7 sm:h-7 mt-1 -ml-4 text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]"
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
          </div>

          {/* Carrusel Interactivo: Finalizados | Hoy (predeterminado) | Próximos */}
          <HeroMatchesCarousel initialMatches={carouselMatches} todayStr={todayStr} />
        </div>
      </section>

      {/* Sponsor Ribbon */}
      <SponsorBanner />

      {/* Centro de Competición & Marcadores */}
      <section className="w-full py-10 sm:py-16 bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 sm:mb-10">
            <div>
              <span className="font-label-sm text-xs uppercase tracking-widest text-primary block font-bold">
                Centro de Competición
              </span>
              <h2 className="font-headline-lg text-3xl sm:text-4xl uppercase tracking-wide text-on-surface mt-1">
                <span>Enfrentamientos y </span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container via-red-500 to-secondary-fixed-dim">
                  Marcadores
                </span>
              </h2>
            </div>
            <Link
              href="/calendario"
              className="group font-label-md text-xs uppercase tracking-wider text-primary hover:text-white flex items-center gap-1.5 transition-colors font-bold"
            >
              <span>Ver Calendario Completo</span>
              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform" aria-hidden="true">
                arrow_forward
              </span>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Featured Match Card (Left 7 Cols) */}
            {featuredMatch && (
              <div className="lg:col-span-7 bg-surface-container-low p-4 sm:p-8 flex flex-col justify-between border border-primary-container/30 shadow-[0px_0px_30px_rgba(217,4,41,0.15)] relative">
                <div>
                  <div className="flex items-center justify-between gap-2 pb-4 border-b border-white/5 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-primary-container text-white text-[11px] font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      {featuredMatch.status === 'LIVE'
                        ? `En Juego • Jornada ${featuredMatch.round}`
                        : `Próxima Jornada ${featuredMatch.round}`}
                    </span>
                    <span className="text-[11px] sm:text-xs text-tertiary uppercase">
                      {formatMadridDate(featuredMatch.matchDate)} • {formatMadridTime(featuredMatch.matchDate)}h
                    </span>
                  </div>

                  {/* Team vs Team Header */}
                  <div className="py-5 sm:py-8 grid grid-cols-5 items-center text-center gap-1">
                    {/* Home Team */}
                    <div className="col-span-2 flex flex-col items-center">
                      <div
                        className={`w-14 h-14 sm:w-20 sm:h-20 bg-surface-container-high flex items-center justify-center p-2 mb-2.5 sm:mb-3 shadow-md ${
                          featuredMatch.isClubHome
                            ? 'border-2 border-primary-container'
                            : 'border border-white/10'
                        }`}
                      >
                        <Image
                          src={getTeamLogo(featuredMatch.homeTeamName)}
                          alt={featuredMatch.homeTeamName}
                          width={60}
                          height={60}
                          className="object-contain max-h-full max-w-full"
                        />
                      </div>
                      {featuredMatch.isClubHome ? (
                        <Link
                          href={`/plantillas?categoria=${featuredCat?.id || 'cat-senior-fem'}`}
                          className="font-display-xl text-base sm:text-xl uppercase text-white hover:text-primary hover:underline decoration-primary underline-offset-4 leading-tight transition-colors"
                          title={`Ver plantilla de ${featuredCat?.name || 'nuestro equipo'}`}
                        >
                          {featuredMatch.homeTeamName}
                        </Link>
                      ) : (
                        <h3 className="font-display-xl text-base sm:text-xl uppercase text-white leading-tight">
                          {featuredMatch.homeTeamName}
                        </h3>
                      )}
                      <span
                        className={`text-[10px] sm:text-[11px] uppercase font-bold mt-1 ${
                          featuredMatch.isClubHome ? 'text-primary' : 'text-tertiary'
                        }`}
                      >
                        Local
                      </span>
                    </div>

                    {/* VS / Live Score Center */}
                    <div className="col-span-1 flex flex-col items-center">
                      {featuredMatch.status === 'LIVE' ? (
                        <span className="font-display-xl text-xl sm:text-3xl text-red-400 uppercase">
                          {featuredMatch.homeScore ?? 0} - {featuredMatch.awayScore ?? 0}
                        </span>
                      ) : (
                        <span className="font-display-xl text-2xl sm:text-3xl text-primary uppercase">VS</span>
                      )}
                      <span className="text-[10px] text-tertiary uppercase mt-1 leading-tight">
                        {featuredCat?.name || 'Liga FAVB'}
                      </span>
                    </div>

                    {/* Away Team */}
                    <div className="col-span-2 flex flex-col items-center">
                      <div
                        className={`w-14 h-14 sm:w-20 sm:h-20 bg-surface-container-high flex items-center justify-center p-2 mb-2.5 sm:mb-3 shadow-md ${
                          !featuredMatch.isClubHome
                            ? 'border-2 border-primary-container'
                            : 'border border-white/10'
                        }`}
                      >
                        <Image
                          src={getTeamLogo(featuredMatch.awayTeamName)}
                          alt={featuredMatch.awayTeamName}
                          width={60}
                          height={60}
                          className="object-contain max-h-full max-w-full"
                        />
                      </div>
                      {!featuredMatch.isClubHome ? (
                        <Link
                          href={`/plantillas?categoria=${featuredCat?.id || 'cat-senior-fem'}`}
                          className="font-display-xl text-base sm:text-xl uppercase text-on-surface hover:text-primary hover:underline decoration-primary underline-offset-4 leading-tight transition-colors"
                          title={`Ver plantilla de ${featuredCat?.name || 'nuestro equipo'}`}
                        >
                          {featuredMatch.awayTeamName}
                        </Link>
                      ) : (
                        <h3 className="font-display-xl text-base sm:text-xl uppercase text-on-surface leading-tight">
                          {featuredMatch.awayTeamName}
                        </h3>
                      )}
                      <span
                        className={`text-[10px] sm:text-[11px] uppercase font-bold mt-1 ${
                          !featuredMatch.isClubHome ? 'text-primary' : 'text-tertiary'
                        }`}
                      >
                        Visitante
                      </span>
                    </div>
                  </div>

                  {/* Venue info */}
                  <div className="bg-surface-container-lowest p-4 border-l-4 border-primary-container flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]" aria-hidden="true">stadium</span>
                      <div>
                        <p className="font-body-sm text-sm font-semibold text-white">
                          {featuredMatch.venueName}
                        </p>
                        <p className="text-xs text-tertiary">
                          {featuredMatch.isClubHome
                            ? 'Diseminado Ensanche Sur I, 16S, Marbella (Málaga)'
                            : 'Desplazamiento Oficial • Partido Visitante'}
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-white/10 text-white text-xs font-bold uppercase tracking-wider border border-white/10">
                      {featuredCat?.name || 'Competición FAVB'}
                    </span>
                  </div>
                </div>

                {/* Match Actions */}
                <div className="pt-6 mt-6 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                  <Link
                    href={`/partidos?categoria=${featuredCat?.id || 'cat-senior-fem'}&match=${featuredMatch.id}`}
                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary hover:text-white"
                  >
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">sports_volleyball</span>
                    Ver en Centro de Partidos
                  </Link>

                  <a
                    href={
                      featuredMatch.isClubHome
                        ? CLUB_INFO.venueMapsUrl
                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            `${featuredMatch.venueName} Andalucía`
                          )}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-tertiary hover:text-white uppercase font-semibold"
                  >
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">near_me</span>
                    Cómo llegar al Pabellón
                  </a>
                </div>
              </div>
            )}

            {/* Recent Results Breakdown (Right 5 Cols) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="font-headline-sm text-base uppercase text-white font-bold flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary-container" />
                  Últimos Resultados Oficiales
                </h3>
                <Link href="/partidos" className="text-xs text-tertiary hover:text-primary uppercase font-bold">
                  Ver todos
                </Link>
              </div>

              {recentMatches.map((match) => {
                const scoreResult = calculateMatchScore(match.setScores);
                const matchTeam = teamMap.get(match.teamId);
                const matchCat = matchTeam ? catMap.get(matchTeam.categoryId) : undefined;
                const matchCatId = matchCat?.id || 'cat-senior-fem';
                const getScoreColor = (myVal: number, oppVal: number) => {
                  if (myVal > oppVal) return 'text-emerald-400';
                  if (myVal < oppVal) return 'text-white';
                  return 'text-amber-300';
                };
                return (
                  <div
                    key={match.id}
                    className="relative bg-surface-container-low border border-white/5 hover:border-primary-container/40 p-3.5 sm:p-4 transition-all"
                  >
                    <Link
                      href={`/partidos?categoria=${matchCatId}&match=${match.id}`}
                      className="absolute inset-0 z-0"
                      aria-label={`Ver detalles del resultado ${match.homeTeamName} contra ${match.awayTeamName}`}
                    />

                    {/* Cabecera con Jornada, Fecha y Encabezados de Sets formato tenis */}
                    <div className="relative z-10 pointer-events-none flex items-center justify-between gap-2 text-[11px] text-tertiary uppercase pb-2 border-b border-white/5">
                      <span className="truncate">
                        <strong className="text-primary font-bold">{matchCat?.name || 'FAVB'}</strong> • J{match.round}{' '}
                        • {formatMadridDate(match.matchDate, { day: 'numeric', month: 'short' })}
                      </span>

                      <div className="flex items-center gap-1 shrink-0">
                        {match.setScores.map((_, sIdx) => (
                          <span
                            key={`recent-hdr-${sIdx}`}
                            className="w-6 sm:w-7 text-center font-mono text-[10px] font-extrabold text-tertiary"
                          >
                            S{sIdx + 1}
                          </span>
                        ))}
                        <span className="w-7 sm:w-8 ml-0.5 pl-1 border-l border-white/15 text-center font-mono text-[10px] font-extrabold text-primary">
                          SETS
                        </span>
                      </div>
                    </div>

                    {/* Filas de Equipos + Puntos de cada Set + Total de Sets */}
                    <div className="relative z-10 pointer-events-none pt-2.5 space-y-2">
                      {/* Equipo Local */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <Image
                            src={getTeamLogo(match.homeTeamName)}
                            alt={match.homeTeamName}
                            width={32}
                            height={32}
                            className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0"
                          />
                          {match.isClubHome ? (
                            <Link
                              href={`/plantillas?categoria=${matchCatId}`}
                              className="pointer-events-auto inline-flex items-center min-h-[28px] py-1 text-xs sm:text-sm text-primary font-bold truncate hover:underline decoration-primary underline-offset-2"
                              title={`Ver plantilla de ${matchCat?.name || 'nuestro equipo'}`}
                            >
                              {match.homeTeamName}
                            </Link>
                          ) : (
                            <span className="text-xs sm:text-sm font-semibold text-on-surface truncate">
                              {match.homeTeamName}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {match.setScores.map((set, sIdx) => (
                            <span
                              key={`recent-home-${sIdx}`}
                              className={`w-7 sm:w-7.5 h-7 flex items-center justify-center font-mono text-xs sm:text-sm font-extrabold leading-none bg-white/[0.04] rounded-[2px] ${getScoreColor(
                                set.home,
                                set.away
                              )}`}
                            >
                              {set.home}
                            </span>
                          ))}
                          <span
                            className={`w-7 sm:w-8 ml-0.5 pl-1 border-l border-white/15 h-7 flex items-center justify-center font-display-xl text-base sm:text-lg font-bold leading-none bg-white/[0.08] ${getScoreColor(
                              scoreResult.homeSetsWon,
                              scoreResult.awaySetsWon
                            )}`}
                          >
                            {scoreResult.homeSetsWon}
                          </span>
                        </div>
                      </div>

                      {/* Equipo Visitante */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <Image
                            src={getTeamLogo(match.awayTeamName)}
                            alt={match.awayTeamName}
                            width={32}
                            height={32}
                            className="w-7 h-7 sm:w-8 sm:h-8 object-contain shrink-0"
                          />
                          {!match.isClubHome ? (
                            <Link
                              href={`/plantillas?categoria=${matchCatId}`}
                              className="pointer-events-auto inline-flex items-center min-h-[28px] py-1 text-xs sm:text-sm text-primary font-bold truncate hover:underline decoration-primary underline-offset-2"
                              title={`Ver plantilla de ${matchCat?.name || 'nuestro equipo'}`}
                            >
                              {match.awayTeamName}
                            </Link>
                          ) : (
                            <span className="text-xs sm:text-sm font-semibold text-on-surface truncate">
                              {match.awayTeamName}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {match.setScores.map((set, sIdx) => (
                            <span
                              key={`recent-away-${sIdx}`}
                              className={`w-6 sm:w-7 py-0.5 text-center font-mono text-xs sm:text-sm font-extrabold leading-none bg-white/[0.04] rounded-[2px] ${getScoreColor(
                                set.away,
                                set.home
                              )}`}
                            >
                              {set.away}
                            </span>
                          ))}
                          <span
                            className={`w-7 sm:w-8 ml-0.5 pl-1 border-l border-white/15 py-0.5 text-center font-display-xl text-base sm:text-lg font-bold leading-none bg-white/[0.07] ${getScoreColor(
                              scoreResult.awaySetsWon,
                              scoreResult.homeSetsWon
                            )}`}
                          >
                            {scoreResult.awaySetsWon}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Noticias Destacadas */}
      <section className="w-full py-16 bg-surface-container-low border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <span className="font-label-sm text-xs uppercase tracking-widest text-primary block font-bold">
                Actualidad Sampedreña
              </span>
              <h2 className="font-headline-lg text-3xl sm:text-4xl uppercase tracking-wide text-on-surface mt-1">
                <span>Crónicas y </span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container via-red-500 to-secondary-fixed-dim">
                  Noticias del Club
                </span>
              </h2>
            </div>
            <Link
              href="/noticias"
              className="font-label-md text-xs uppercase tracking-wider text-primary hover:text-white flex items-center gap-1.5 transition-colors font-bold"
            >
              <span>Ir a Sala de Prensa</span>
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_forward</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {articles.map((art) => (
              <Link
                key={art.id}
                href={`/noticias/${art.slug}`}
                className="group bg-surface-container-lowest border border-white/5 hover:border-primary-container transition-all flex flex-col justify-between block cursor-pointer overflow-hidden shadow-lg hover:-translate-y-1"
              >
                <div>
                  <div className="relative h-48 w-full overflow-hidden bg-surface-container-low">
                    <Image
                      src={art.coverImageUrl}
                      alt={art.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-3 left-3 px-2 py-1 bg-primary-container text-white text-[10px] font-bold uppercase tracking-wider shadow">
                      {art.categoryName}
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-3 text-xs text-tertiary mb-2">
                      <span>{formatMadridDate(art.publishedAt, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span>•</span>
                      <span>{art.readingTimeMinutes} min de lectura</span>
                    </div>
                    <h3 className="font-headline-sm text-headline-sm uppercase text-on-surface font-bold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                      {art.title}
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 line-clamp-3">
                      {art.excerpt}
                    </p>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary group-hover:text-white transition-colors"
                  >
                    <span>Leer Noticia Completa</span>
                    <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform" aria-hidden="true">
                      arrow_forward
                    </span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
