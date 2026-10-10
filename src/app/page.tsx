import Link from 'next/link';
import Image from 'next/image';
import { store, CLUB_INFO } from '@/lib/data-store';
import { formatMadridDate, formatMadridTime } from '@/lib/date-utils';
import { calculateMatchScore } from '@/lib/volleyball-rules';
import { getTeamLogo } from '@/lib/team-logos';
import SponsorBanner from '@/components/SponsorBanner';

export const revalidate = 0;

export default function HomePage() {
  const featuredMatch = store.getFeaturedMatch();
  const recentMatches = store.getRecentMatches().slice(0, 3);
  const articles = store.getArticles().slice(0, 3);

  const categories = store.getCategories();
  const teams = store.getTeams();
  const matches = store.getMatches();

  // Próximo partido programado de cada categoría oficial ordenados por:
  // 1. Proximidad temporal (de izquierda a derecha, el más cercano primero)
  // 2. A la misma fecha y hora, primero el de mayor categoría (menor category.order)
  const upcomingMatchesByCategory = categories
    .map((cat) => {
      const catTeams = teams.filter((t) => t.categoryId === cat.id);
      const catTeamIds = new Set(catTeams.map((t) => t.id));
      const catMatches = matches
        .filter((m) => catTeamIds.has(m.teamId) && (m.status === 'SCHEDULED' || m.status === 'LIVE'))
        .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
      const nextMatch = catMatches[0];
      return {
        category: cat,
        match: nextMatch,
      };
    })
    .filter(
      (
        item
      ): item is {
        category: (typeof categories)[0];
        match: NonNullable<typeof item.match>;
      } => item.match !== undefined
    )
    .sort((a, b) => {
      const timeA = new Date(a.match.matchDate).getTime();
      const timeB = new Date(b.match.matchDate).getTime();
      if (timeA !== timeB) {
        return timeA - timeB;
      }
      const orderA = a.category.order ?? 99;
      const orderB = b.category.order ?? 99;
      return orderA - orderB;
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
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 self-start px-3 py-1 bg-surface-container-high/90 backdrop-blur-sm text-on-surface shadow-[4px_4px_0px_0px_#d90429] mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-primary-container animate-pulse" />
            <span className="font-label-sm text-[11px] uppercase tracking-widest text-primary font-bold">
              DEPORTE BASE • ADSCRITO A LA FEDERACIÓN ANDALUZA DE VOLEIBOL (FAVB)
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="font-display-xl text-4xl sm:text-5xl lg:text-6xl xl:text-7xl tracking-tight text-on-surface uppercase max-w-3xl leading-[0.95]">
            PASIÓN, CANTERA <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container via-red-500 to-secondary-fixed-dim">
              Y ORGULLO SAMPEDREÑO.
            </span>
          </h1>

          <p className="font-body-lg text-sm sm:text-base lg:text-lg text-tertiary-fixed max-w-2xl mt-2.5 mb-2">
            Club deportivo formativo volcado en el deporte base, los jóvenes y las familias de San Pedro Alcántara.
          </p>

          {/* Próximos Partidos por Categoría (Tira simplificada e interactiva) */}
          <div className="mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-white/10 w-full">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
                <span className="font-label-sm text-[11px] sm:text-xs uppercase tracking-widest text-primary font-bold">
                  Próximos Partidos por Categoría
                </span>
                <span className="text-[10px] text-tertiary hidden md:inline">
                  · Pulsa en un partido para ver detalles completos
                </span>
              </div>
              <Link
                href="/partidos"
                className="text-[11px] sm:text-xs text-tertiary hover:text-white uppercase font-bold flex items-center gap-1 group transition-colors"
              >
                <span>Ver todos</span>
                <span className="material-symbols-outlined text-[15px] group-hover:translate-x-0.5 transition-transform">
                  arrow_forward
                </span>
              </Link>
            </div>

            {/* Carrusel horizontal suave de tarjetas */}
            <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth">
              {upcomingMatchesByCategory.map(({ category, match }) => (
                <Link
                  key={category.id}
                  href={`/partidos?categoria=${category.id}&match=${match.id}#match-${match.id}`}
                  className="group shrink-0 w-[215px] sm:w-[235px] bg-surface-container-low/95 hover:bg-surface-container-high border border-white/10 hover:border-primary-container p-2.5 sm:p-3 flex flex-col justify-between transition-all duration-200 shadow-md hover:-translate-y-0.5"
                  title={`Ver detalles: ${category.name} en partidos`}
                >
                  {/* Cabecera: Jornada, Categoría, Estado y Casa/Avión */}
                  <div className="flex items-center justify-between gap-1 pb-1.5 border-b border-white/5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="px-1.5 py-0.5 bg-primary-container text-white font-mono text-[9px] sm:text-[10px] font-bold">
                        J{match.round}
                      </span>
                      <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-white truncate">
                        {category.name}
                      </span>
                      {match.status === 'LIVE' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-950 text-red-400 border border-red-500/50 text-[9px] font-bold uppercase tracking-wider animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                          DIRECTO
                        </span>
                      )}
                    </div>
                    <span
                      className={`w-5 h-5 flex items-center justify-center shrink-0 border ${
                        match.isClubHome
                          ? 'text-primary bg-primary-container/15 border-primary-container/30'
                          : 'text-tertiary bg-white/5 border-white/10'
                      }`}
                      title={match.isClubHome ? 'En casa (Pabellón Sergio Scariolo)' : 'Fuera / A domicilio'}
                    >
                      <span className="material-symbols-outlined text-[13px] sm:text-[14px]">
                        {match.isClubHome ? 'home' : 'flight'}
                      </span>
                    </span>
                  </div>

                  {/* Enfrentamiento simplificado */}
                  <div className="py-2">
                    <p className="text-[10px] sm:text-[11px] font-semibold truncate text-on-surface">
                      <span className={match.isClubHome ? 'text-primary font-bold' : 'text-on-surface'}>
                        {match.homeTeamName}
                      </span>
                      <span className="text-tertiary mx-1 font-normal">vs</span>
                      <span className={!match.isClubHome ? 'text-primary font-bold' : 'text-on-surface'}>
                        {match.awayTeamName}
                      </span>
                    </p>
                  </div>

                  {/* Fecha & Hora o Marcador en Vivo */}
                  {match.status === 'LIVE' ? (
                    <div className="pt-1.5 border-t border-red-500/30 flex items-center justify-between text-[10px] sm:text-[11px]">
                      <span className="text-red-400 font-bold uppercase flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                        En Juego
                      </span>
                      <span className="font-bold text-white font-mono">
                        {match.homeScore ?? 0} : {match.awayScore ?? 0} Sets
                      </span>
                    </div>
                  ) : (
                    <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] sm:text-[11px]">
                      <span className="text-tertiary capitalize">
                        {formatMadridDate(match.matchDate, { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                      <span className="font-bold text-primary font-mono">
                        {formatMadridTime(match.matchDate)}h
                      </span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Sponsor Ribbon */}
      <SponsorBanner />

      {/* Centro de Competición & Marcadores */}
      <section className="w-full py-16 bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto px-4 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <span className="font-label-sm text-xs uppercase tracking-widest text-primary block font-bold">
                Centro de Competición
              </span>
              <h2 className="font-headline-lg text-3xl sm:text-4xl uppercase tracking-wide text-on-surface mt-1">
                Enfrentamientos y Marcadores
              </h2>
            </div>
            <Link
              href="/calendario"
              className="group font-label-md text-xs uppercase tracking-wider text-primary hover:text-white flex items-center gap-1.5 transition-colors font-bold"
            >
              <span>Ver Calendario Completo</span>
              <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">
                arrow_forward
              </span>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Featured Match Card (Left 7 Cols) */}
            {featuredMatch && (
              <div className="lg:col-span-7 bg-surface-container-low p-6 sm:p-8 flex flex-col justify-between border border-primary-container/30 shadow-[0px_0px_30px_rgba(217,4,41,0.15)] relative">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-white/5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-primary-container text-white text-[11px] font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      Próxima Jornada {featuredMatch.round}
                    </span>
                    <span className="text-xs text-tertiary uppercase">
                      {formatMadridDate(featuredMatch.matchDate)} • {formatMadridTime(featuredMatch.matchDate)}h
                    </span>
                  </div>

                  {/* Team vs Team Header */}
                  <div className="py-8 grid grid-cols-5 items-center text-center">
                    {/* Home Team */}
                    <div className="col-span-2 flex flex-col items-center">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-surface-container-high border-2 border-primary-container flex items-center justify-center p-2 mb-3 shadow-md">
                        <Image
                          src={getTeamLogo(featuredMatch.homeTeamName)}
                          alt={featuredMatch.homeTeamName}
                          width={60}
                          height={60}
                          className="object-contain max-h-full max-w-full"
                        />
                      </div>
                      <h4 className="font-display-xl text-lg sm:text-xl uppercase text-white leading-tight">
                        {featuredMatch.homeTeamName}
                      </h4>
                      <span className="text-[11px] text-primary uppercase font-bold mt-1">Local</span>
                    </div>

                    {/* VS Center */}
                    <div className="col-span-1 flex flex-col items-center">
                      <span className="font-display-xl text-2xl sm:text-3xl text-primary uppercase">VS</span>
                      <span className="text-[10px] text-tertiary uppercase mt-1">1ª Andaluza</span>
                    </div>

                    {/* Away Team */}
                    <div className="col-span-2 flex flex-col items-center">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-surface-container-high border border-white/10 flex items-center justify-center p-2 mb-3 shadow-md">
                        <Image
                          src={getTeamLogo(featuredMatch.awayTeamName)}
                          alt={featuredMatch.awayTeamName}
                          width={60}
                          height={60}
                          className="object-contain max-h-full max-w-full"
                        />
                      </div>
                      <h4 className="font-display-xl text-lg sm:text-xl uppercase text-on-surface leading-tight">
                        {featuredMatch.awayTeamName}
                      </h4>
                      <span className="text-[11px] text-tertiary uppercase mt-1">Visitante</span>
                    </div>
                  </div>

                  {/* Venue info & free entry notice */}
                  <div className="bg-surface-container-lowest p-4 border-l-4 border-primary-container flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-[20px]">stadium</span>
                      <div>
                        <p className="font-body-sm text-sm font-semibold text-white">
                          {featuredMatch.venueName}
                        </p>
                        <p className="text-xs text-tertiary">Diseminado Ensanche Sur I, 16S, Marbella (Málaga)</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-white/10 text-white text-xs font-bold uppercase tracking-wider border border-white/10">
                      1ª Andaluza Senior
                    </span>
                  </div>
                </div>

                {/* Match Actions */}
                <div className="pt-6 mt-6 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
                  <Link
                    href="/calendario"
                    className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary hover:text-white"
                  >
                    <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                    Ver en Calendario Oficial
                  </Link>

                  <a
                    href={CLUB_INFO.venueMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-tertiary hover:text-white uppercase font-semibold"
                  >
                    <span className="material-symbols-outlined text-[16px]">near_me</span>
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
                return (
                  <div
                    key={match.id}
                    className="bg-surface-container-low border border-white/5 hover:border-primary-container/40 p-4 transition-all"
                  >
                    <div className="flex items-center justify-between text-[11px] text-tertiary uppercase pb-2 border-b border-white/5">
                      <span>Jornada {match.round} • {formatMadridDate(match.matchDate, { day: 'numeric', month: 'short' })}</span>
                      <span className="px-1.5 py-0.5 bg-surface-container-high text-white font-bold">
                        Finalizado
                      </span>
                    </div>

                    <div className="py-3 flex items-center justify-between gap-4">
                      <div className="flex-1 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-surface-container-high border border-white/10 p-0.5 shrink-0 flex items-center justify-center">
                              <Image
                                src={getTeamLogo(match.homeTeamName)}
                                alt={match.homeTeamName}
                                width={18}
                                height={18}
                                className="object-contain max-h-full max-w-full"
                              />
                            </div>
                            <span className={`text-sm font-semibold truncate ${match.isClubHome ? 'text-primary' : 'text-on-surface'}`}>
                              {match.homeTeamName}
                            </span>
                          </div>
                          <span className="font-display-xl text-xl text-white">
                            {scoreResult.homeSetsWon}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-surface-container-high border border-white/10 p-0.5 shrink-0 flex items-center justify-center">
                              <Image
                                src={getTeamLogo(match.awayTeamName)}
                                alt={match.awayTeamName}
                                width={18}
                                height={18}
                                className="object-contain max-h-full max-w-full"
                              />
                            </div>
                            <span className={`text-sm font-semibold truncate ${!match.isClubHome ? 'text-primary' : 'text-on-surface'}`}>
                              {match.awayTeamName}
                            </span>
                          </div>
                          <span className="font-display-xl text-xl text-white">
                            {scoreResult.awaySetsWon}
                          </span>
                        </div>
                      </div>
                    </div>

                    {match.setScores.length > 0 && (
                      <div className="pt-2 border-t border-white/5 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-tertiary uppercase mr-1">Sets:</span>
                        {match.setScores.map((set, sIdx) => {
                          const isHomeWinner = set.home > set.away;
                          return (
                            <span
                              key={sIdx}
                              className="px-2 py-0.5 bg-surface-container-lowest text-[11px] font-mono text-tertiary border border-white/5"
                            >
                              <strong className={isHomeWinner ? 'text-primary' : 'text-on-surface'}>
                                {set.home}
                              </strong>
                              -
                              <strong className={!isHomeWinner ? 'text-primary' : 'text-on-surface'}>
                                {set.away}
                              </strong>
                            </span>
                          );
                        })}
                      </div>
                    )}
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
                Crónicas y Noticias del Club
              </h2>
            </div>
            <Link
              href="/noticias"
              className="font-label-md text-xs uppercase tracking-wider text-primary hover:text-white flex items-center gap-1.5 transition-colors font-bold"
            >
              <span>Ir a Sala de Prensa</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
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
                    <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                      arrow_forward
                    </span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Banner Institucional Federación Andaluza de Voleibol (FAVB) */}
      <section className="w-full bg-surface-container-high py-12 px-4 lg:px-8 border-y border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-primary-container text-white flex items-center justify-center font-display-xl text-xl shrink-0 shadow-lg">
              FAVB
            </div>
            <div>
              <span className="text-xs uppercase tracking-widest text-primary font-bold">
                Afiliación Oficial
              </span>
              <h3 className="font-headline-sm text-lg sm:text-xl uppercase text-white font-bold">
                Adscrito a la Federación Andaluza de Voleibol
              </h3>
              <p className="font-body-sm text-xs text-tertiary max-w-2xl mt-1">
                Todas las competiciones de nuestro club se rigen bajo los reglamentos y actas oficiales de la FAVB y la RFEVB. Consulta normativas, calendarios autonómicos y designaciones arbitrales oficiales.
              </p>
            </div>
          </div>

          <a
            href={CLUB_INFO.federationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-surface-container-lowest hover:bg-primary-container text-white font-label-md text-xs uppercase tracking-wider font-bold border border-white/10 transition-all shadow-md"
          >
            <span>Portal FAVB (favoley.net)</span>
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          </a>
        </div>
      </section>
    </div>
  );
}
