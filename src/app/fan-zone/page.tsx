'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import confetti from 'canvas-confetti';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Download,
  Heart,
  Loader2,
  ShieldCheck,
  Trophy,
  Vote,
} from 'lucide-react';
import { CLUB_INFO } from '@/lib/club-info';
import { formatMadridDate } from '@/lib/date-utils';
import { sanitizeHttpsUrl } from '@/lib/validators';
import SponsorBanner from '@/components/SponsorBanner';
import { InstagramIcon, FacebookIcon } from '@/components/SocialIcons';
import { POSITION_SHORT_LABELS } from '@/lib/types';

interface MvpMatchInfo {
  id: string;
  teamId?: string;
  categoryName: string;
  round: number;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  matchDate: string;
}

interface MvpCandidate {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  number: number;
  position: string;
  photoUrl: string;
}

const CLUB_CHANTS = [
  {
    id: 'chant-1',
    title: '¡Vamos mi San Pedro, a ganar!',
    rhythm: 'Palmas al compás acelerado',
    lyrics: `(Coro de grada)
¡Vamos mi San Pedro, hoy hay que ganar!
Desde Fuente Nueva hasta el bulevar,
¡Rojinegro el pecho, orgullo de verdad!
¡Punto a punto el Sergio Scariolo rugirá!
(Paaaaalmas: ¡San Pedro! ¡San Pedro! ¡Hey!)`,
  },
  {
    id: 'chant-2',
    title: 'San Pedro de mi vida',
    rhythm: 'Canto melódico con bufandas en alto',
    lyrics: `San Pedro de mi vida,
tú eres mi pasión,
defiéndeme esa bola,
con todo el corazón.
No importa la distancia,
ni quién esté enfrente,
¡el pueblo sampedreño
siempre está presente!`,
  },
  {
    id: 'chant-3',
    title: 'Bloqueo en la red',
    rhythm: 'Grito de guerra tras punto de bloqueo',
    lyrics: `¡Aquí no pasa nada!
¡Aquí mandamos hoy!
¡La red es una muralla,
de San Pedro yo soy!`,
  },
];

const CLUB_GALLERY_ITEMS = [
  {
    id: 'sp-1',
    author: 'Pabellón Polideportivo Sergio Scariolo',
    caption: 'La casa del voleibol sampedreño en cada jornada federada FAVB y Liga AFADE.',
    imageUrl: '/images/pabellon-sergio-scariolo.jpg',
    tag: 'Sede Oficial',
  },
  {
    id: 'sp-2',
    author: 'Competición Autonómica Senior',
    caption: 'Intensidad en la red y trabajo en equipo defendiendo el escudo rojinegro.',
    imageUrl: '/images/hero-spike.png',
    tag: '1ª División Andaluza',
  },
  {
    id: 'sp-3',
    author: 'Más de 25 años formando cantera',
    caption: 'Deporte base, valores y afición en San Pedro Alcántara con #VoleibolSanPedro.',
    imageUrl: '/images/logo.jpg',
    tag: 'C.D. Voleibol San Pedro',
  },
];

const CLUB_WALLPAPERS = [
  {
    id: 'wp-1',
    title: 'Poder en la Red - Remate Espectacular',
    type: 'MOBILE',
    dimensions: '1080 x 1920 (9:16)',
    imageUrl: '/images/hero-spike.png',
    downloadUrl: '/images/hero-spike.png',
  },
  {
    id: 'wp-2',
    title: 'Escudo Rojinegro - Identidad Oficial',
    type: 'DESKTOP',
    dimensions: '1920 x 1080 (16:9)',
    imageUrl: '/images/logo.jpg',
    downloadUrl: '/images/logo.jpg',
  },
  {
    id: 'wp-3',
    title: 'Pabellón Sergio Scariolo - Casa Rojinegra',
    type: 'POSTER',
    dimensions: 'Alta Resolución Oficial',
    imageUrl: '/images/pabellon-sergio-scariolo.jpg',
    downloadUrl: '/images/pabellon-sergio-scariolo.jpg',
  },
];

export default function FanZonePage() {
  // Estado de votación MVP real contra /api/public/mvp-vote
  const [mvpMatch, setMvpMatch] = useState<MvpMatchInfo | null>(null);
  const [mvpCandidates, setMvpCandidates] = useState<MvpCandidate[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [totalVotes, setTotalVotes] = useState<number>(0);
  const [loadingMvp, setLoadingMvp] = useState<boolean>(true);
  const [voting, setVoting] = useState<boolean>(false);
  const [votingError, setVotingError] = useState<string | null>(null);
  const [votingFeedback, setVotingFeedback] = useState<string | null>(null);
  const [honeypotWebsite, setHoneypotWebsite] = useState<string>('');

  const loadMvpData = useCallback(async () => {
    setLoadingMvp(true);
    setVotingError(null);
    try {
      const res = await fetch('/api/public/mvp-vote');
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setVotingError(data?.error || 'No se pudo cargar la votación MVP en este momento.');
        return;
      }

      setMvpMatch(data.match || null);
      setMvpCandidates(Array.isArray(data.candidates) ? data.candidates : []);
      setVoteCounts(data.voteCounts && typeof data.voteCounts === 'object' ? data.voteCounts : {});
      setTotalVotes(typeof data.totalVotes === 'number' ? data.totalVotes : 0);

      let localVoted = false;
      if (data.match?.id) {
        try {
          localVoted = localStorage.getItem(`cdv_mvp_voted_${data.match.id}`) === 'true';
        } catch {
          localVoted = false;
        }
      }
      setHasVoted(Boolean(data.hasVoted) || localVoted);
    } catch {
      setVotingError('Error de conexión al cargar la votación MVP.');
    } finally {
      setLoadingMvp(false);
    }
  }, []);

  useEffect(() => {
    loadMvpData();
  }, [loadMvpData]);

  // Votar por MVP en backend real
  const handleVoteSubmit = async () => {
    if (!mvpMatch || !selectedPlayerId || hasVoted || voting) return;

    setVoting(true);
    setVotingError(null);
    try {
      const res = await fetch('/api/public/mvp-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: mvpMatch.id,
          playerId: selectedPlayerId,
          website: honeypotWebsite,
        }),
      });
      const data = await res.json().catch(() => null);

      if (res.status === 409 && data?.alreadyVoted) {
        setVoteCounts(data.voteCounts && typeof data.voteCounts === 'object' ? data.voteCounts : voteCounts);
        setTotalVotes(typeof data.totalVotes === 'number' ? data.totalVotes : totalVotes);
        setHasVoted(true);
        try {
          localStorage.setItem(`cdv_mvp_voted_${mvpMatch.id}`, 'true');
        } catch {
          // Ignorar bloqueo de almacenamiento local
        }
        setVotingFeedback(data.error || 'Ya has registrado tu voto para este partido.');
        return;
      }

      if (!res.ok || !data?.success) {
        setVotingError(data?.error || 'No se pudo registrar tu voto. Inténtalo de nuevo.');
        return;
      }

      setVoteCounts(data.voteCounts && typeof data.voteCounts === 'object' ? data.voteCounts : voteCounts);
      setTotalVotes(typeof data.totalVotes === 'number' ? data.totalVotes : totalVotes + 1);
      setHasVoted(true);
      try {
        localStorage.setItem(`cdv_mvp_voted_${mvpMatch.id}`, 'true');
      } catch {
        // Ignorar bloqueo de almacenamiento local
      }
      setVotingFeedback(data.message || '¡Voto registrado con éxito! Gracias por apoyar al equipo.');

      // Disparar confeti deportivo (el CSS global respeta prefers-reduced-motion; evitamos confeti si el usuario pide movimiento reducido)
      try {
        const prefersReduced =
          typeof window !== 'undefined' &&
          window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        if (!prefersReduced) {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.7 },
            colors: ['#d90429', '#ffffff', '#ffb3af'],
          });
        }
      } catch {
        // Ignorar si el navegador bloquea canvas
      }
    } catch {
      setVotingError('Error de conexión al enviar tu voto. Inténtalo de nuevo.');
    } finally {
      setVoting(false);
    }
  };

  const safeInstagramUrl = sanitizeHttpsUrl(CLUB_INFO.instagramUrl, 'https://www.instagram.com/voleibolsanpedro/');
  const safeFacebookUrl = sanitizeHttpsUrl(CLUB_INFO.facebookUrl, 'https://www.facebook.com/');

  return (
    <div className="w-full min-h-screen bg-background relative overflow-hidden">
      {/* Subtle Page-Wide Ambient Background */}
      <div
        className="pointer-events-none fixed inset-0 w-full h-full bg-cover bg-center mix-blend-luminosity opacity-[0.14] blur-[3px] z-0"
        style={{ backgroundImage: "url('/images/pabellon-sergio-scariolo.jpg')" }}
      />

      {/* Top Banner */}
      <section className="relative w-full bg-surface-container-lowest px-4 lg:px-8 py-12 border-b border-white/5 overflow-hidden">
        {/* Background Image (Pabellón Sergio Scariolo) with slight blur */}
        <div
          className="pointer-events-none absolute inset-0 w-full h-full bg-cover bg-center mix-blend-luminosity opacity-40 blur-[2px] scale-105 animate-hero-bg transition-transform duration-1000"
          style={{ backgroundImage: "url('/images/pabellon-sergio-scariolo.jpg')" }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/85 to-transparent" />

        <div className="absolute -right-20 -top-24 w-96 h-96 rounded-full bg-primary-container/10 blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-primary-container text-white text-[11px] uppercase font-bold tracking-widest">
                LA GRADA SAMPEDREÑA
              </span>
              <span className="text-xs text-tertiary uppercase tracking-wider">
                #VOLEIBOLSAMPEDRO
              </span>
            </div>
            <h1 className="font-display-xl text-4xl sm:text-5xl lg:text-6xl uppercase tracking-tight leading-none">
              <span className="text-white">FAN-ZONE </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container via-red-500 to-secondary-fixed-dim">
                COMUNITARIA
              </span>
            </h1>
            <p className="font-body-md text-sm sm:text-base text-tertiary max-w-2xl mt-2">
              El corazón del Sergio Scariolo: vota el MVP de cada jornada, canta con la grada rojinegra, comparte tus fotos y descarga fondos oficiales del club.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-primary font-bold uppercase tracking-wider shrink-0">
            <Heart className="w-5 h-5" aria-hidden="true" />
            <span>«Voleibol para todos»</span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10 space-y-16 relative z-10">
        {/* BLOQUE 1: Votación Popular de MVP (Exclusivo Categoría Senior +18 con consentimiento activo) */}
        <section className="bg-surface-container-low border border-primary-container/30 p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-primary font-bold uppercase tracking-wider">
                  Votación de la Afición
                </span>
                <span className="px-2 py-0.5 bg-primary-container text-white text-[10px] font-bold uppercase tracking-wider">
                  Exclusivo Categoría Senior (+18)
                </span>
              </div>
              <h2 className="font-display-xl text-2xl sm:text-3xl uppercase text-white mt-1">
                Elige al MVP de la Jornada (Senior)
              </h2>
            </div>
            <div className="flex items-center gap-2 text-xs text-tertiary">
              <Vote className="w-[18px] h-[18px] text-primary" aria-hidden="true" />
              <span>1 voto único por aficionado y partido</span>
            </div>
          </div>

          <div className="mt-4 mb-6 space-y-3">
            <p className="text-xs sm:text-sm text-tertiary">
              Valora el esfuerzo de nuestras jugadoras y jugadores mayores de edad (+18) con consentimiento de imagen activo. Selecciona a tu candidato/a preferido/a y envía tu voto.
            </p>

            {mvpMatch && (
              <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-high border border-white/10 px-4 py-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-white uppercase">
                  <Trophy className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
                  <span>
                    {mvpMatch.categoryName} • Jornada {mvpMatch.round}: {mvpMatch.homeTeam}{' '}
                    {typeof mvpMatch.homeScore === 'number' && typeof mvpMatch.awayScore === 'number'
                      ? `${mvpMatch.homeScore} - ${mvpMatch.awayScore}`
                      : 'vs'}{' '}
                    {mvpMatch.awayTeam}
                  </span>
                </div>
                <span className="text-tertiary font-mono text-[11px]">
                  {formatMadridDate(mvpMatch.matchDate, { day: 'numeric', month: 'short', year: 'numeric' })} • {totalVotes} votos
                </span>
              </div>
            )}

            <p className="text-[11px] text-tertiary/90 bg-surface-container-lowest border-l-2 border-primary-container px-3 py-2">
              <strong className="text-white">Deporte formativo sin presión para menores:</strong> La votación de MVP se habilita exclusivamente para categoría Senior (+18) con autorización vigente, fomentando el compañerismo libre de clasificaciones individuales en cantera.
            </p>
          </div>

          {/* Honeypot anti-bots invisible */}
          <div className="sr-only" aria-hidden="true">
            <label htmlFor="mvp-website-hp">Sitio web</label>
            <input
              id="mvp-website-hp"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={honeypotWebsite}
              onChange={(e) => setHoneypotWebsite(e.target.value)}
            />
          </div>

          {votingError && (
            <div
              role="alert"
              className="mb-5 p-3.5 bg-red-950/70 border border-red-500/50 text-red-200 text-xs flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{votingError}</span>
            </div>
          )}

          {loadingMvp ? (
            <div className="py-12 flex items-center justify-center gap-2 text-xs text-tertiary">
              <Loader2 className="w-5 h-5 animate-spin text-primary" aria-hidden="true" />
              <span>Cargando candidatos oficiales del último encuentro...</span>
            </div>
          ) : !mvpMatch || mvpCandidates.length === 0 ? (
            <div className="p-6 bg-surface-container-lowest border border-white/10 text-center text-xs text-tertiary space-y-2">
              <p className="text-white font-semibold">
                No hay votación MVP activa en este momento.
              </p>
              <p>
                Cuando finalice el próximo encuentro oficial Senior (+18) y existan deportistas con autorización vigente de imagen, se habilitarán las candidaturas aquí.
              </p>
            </div>
          ) : (
            <>
              {/* Candidatos Grid (Botones accesibles) */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-6">
                {mvpCandidates.map((candidate) => {
                  const count = voteCounts[candidate.id] || 0;
                  const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                  const isSelected = selectedPlayerId === candidate.id;
                  const fullLabel = `${candidate.firstName} ${candidate.lastName}`.trim();

                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      disabled={hasVoted || voting}
                      onClick={() => !hasVoted && setSelectedPlayerId(candidate.id)}
                      aria-pressed={isSelected}
                      className={`group text-left bg-surface-container-lowest border p-3 sm:p-4 transition-all relative overflow-hidden flex flex-col justify-between ${
                        isSelected
                          ? 'border-primary-container ring-2 ring-primary-container/60 bg-primary-container/10'
                          : 'border-white/5 hover:border-white/25'
                      } ${hasVoted ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <div className="w-full">
                        <div className="relative h-36 sm:h-44 w-full mb-2.5 sm:mb-3 overflow-hidden bg-surface-container-high">
                          <Image
                            src={candidate.photoUrl || '/images/player-placeholder.svg'}
                            alt={fullLabel}
                            fill
                            className="object-cover"
                          />
                          <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/70 font-display-xl text-xl sm:text-2xl text-white">
                            #{candidate.number}
                          </div>
                        </div>

                        <h3 className="font-display-xl text-base sm:text-lg uppercase text-white leading-tight">
                          {fullLabel}
                        </h3>
                        <span className="text-[10px] text-tertiary uppercase block mb-2.5 sm:mb-3">
                          {(POSITION_SHORT_LABELS as Record<string, string>)[candidate.position] || candidate.position}
                        </span>
                      </div>

                      {/* Resultados / Porcentaje */}
                      {hasVoted ? (
                        <div className="w-full space-y-1 pt-2 border-t border-white/10">
                          <div className="flex justify-between text-xs">
                            <span className="text-tertiary">{count} votos</span>
                            <span className="font-bold text-primary">{percent}%</span>
                          </div>
                          <div className="w-full bg-surface-container-high h-2 overflow-hidden">
                            <div
                              className="bg-primary-container h-full transition-all duration-700"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="w-full pt-2">
                          <span
                            className={`block w-full text-center py-2 sm:py-1.5 text-xs uppercase font-bold tracking-wider transition-colors ${
                              isSelected
                                ? 'bg-primary-container text-white'
                                : 'bg-surface-container-high text-tertiary group-hover:text-white'
                            }`}
                          >
                            {isSelected ? 'Seleccionado' : 'Elegir'}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Botón de Enviar Voto */}
              {!hasVoted ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
                  <span className="text-xs text-tertiary text-center sm:text-left">
                    {selectedPlayerId
                      ? 'Has seleccionado una candidatura. Haz clic en el botón para confirmar.'
                      : 'Selecciona una tarjeta arriba para activar tu voto.'}
                  </span>
                  <button
                    type="button"
                    onClick={handleVoteSubmit}
                    disabled={!selectedPlayerId || voting}
                    className="w-full sm:w-auto px-8 py-3 bg-primary-container hover:bg-cta-hover disabled:opacity-40 text-white font-label-md text-xs uppercase font-bold tracking-wider transition-all shadow-[4px_4px_0px_0px_#0e0e0e] flex items-center justify-center gap-2"
                  >
                    {voting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        <span>Registrando voto...</span>
                      </>
                    ) : (
                      <span>Confirmar Voto MVP</span>
                    )}
                  </button>
                </div>
              ) : (
                <div
                  role="status"
                  className="p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
                  <span>{votingFeedback || '¡Tu voto ha sido registrado! Gracias por participar.'}</span>
                </div>
              )}
            </>
          )}
        </section>

        {/* BLOQUE 2: Cánticos de la Grada */}
        <section className="bg-surface-container-low border border-white/5 p-6 sm:p-8 space-y-6">
          <div>
            <span className="text-xs text-primary font-bold uppercase tracking-wider block">
              Letras de la Grada
            </span>
            <h3 className="font-display-xl text-2xl uppercase text-white mt-1">
              Cánticos del Pabellón Sergio Scariolo
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {CLUB_CHANTS.map((chant) => (
              <div
                key={chant.id}
                className="bg-surface-container-lowest border border-white/5 p-5 space-y-3 flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-2.5">
                  <h4 className="font-headline-sm text-sm uppercase text-primary font-bold">
                    {chant.title}
                  </h4>
                  <span className="text-[10px] text-tertiary uppercase font-mono text-right shrink-0">
                    {chant.rhythm}
                  </span>
                </div>
                <pre className="font-body-sm text-xs text-on-surface whitespace-pre-wrap leading-relaxed font-sans flex-1">
                  {chant.lyrics}
                </pre>
              </div>
            ))}
          </div>
        </section>

        {/* BLOQUE 3: Comunidad Rojinegra Oficial (Sin formularios mock ni fotos externas no verificadas) */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-primary font-bold uppercase tracking-wider block">
                Comunidad de Familias y Afición
              </span>
              <h2 className="font-display-xl text-2xl sm:text-3xl uppercase text-white mt-1">
                Comunidad #VoleibolSanPedro
              </h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={safeInstagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-gradient-to-r from-[#833ab4] via-[#c13584] to-[#b8004c] hover:opacity-90 text-white text-xs uppercase font-bold tracking-wider flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_0px_#0e0e0e]"
              >
                <InstagramIcon className="w-4 h-4 text-white" />
                <span>Instagram Oficial</span>
              </a>
              <a
                href={safeFacebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs uppercase font-bold tracking-wider flex items-center gap-1.5 transition-all shadow-[2px_2px_0px_0px_#0e0e0e]"
              >
                <FacebookIcon className="w-4 h-4 text-white" />
                <span>Facebook Oficial</span>
              </a>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-tertiary bg-surface-container-low border border-white/5 px-4 py-3 flex items-center gap-2.5">
            <Camera className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
            <span>
              ¿Tienes fotos desde la grada? Menciona a nuestra cuenta oficial en Instagram o Facebook con el hashtag{' '}
              <strong className="text-white">#VoleibolSanPedro</strong> para aparecer en nuestras publicaciones verificadas.
            </span>
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CLUB_GALLERY_ITEMS.map((photo) => (
              <div
                key={photo.id}
                className="bg-surface-container-low border border-white/5 overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-60 w-full overflow-hidden bg-surface-container-lowest">
                    <Image
                      src={photo.imageUrl}
                      alt={photo.caption}
                      fill
                      className={photo.imageUrl.includes('logo') ? 'object-contain p-4' : 'object-cover'}
                    />
                  </div>
                  <div className="p-4 space-y-2">
                    <span className="text-[11px] text-primary font-bold uppercase block">
                      {photo.author}
                    </span>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {photo.caption}
                    </p>
                  </div>
                </div>

                <div className="p-4 pt-3 flex items-center justify-between text-xs text-tertiary border-t border-white/5 mt-2">
                  <span className="text-[10px] text-tertiary font-mono">#VoleibolSanPedro</span>
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    {photo.tag}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* BLOQUE 4: Zona de Descargas Digitales Gratuitas */}
        <section className="bg-surface-container-low border border-white/5 p-6 sm:p-8 space-y-6">
          <div>
            <span className="text-xs text-primary font-bold uppercase tracking-wider block">
              Contenido Oficial Descargable
            </span>
            <h2 className="font-display-xl text-2xl sm:text-3xl uppercase text-white mt-1">
              Fondos de Pantalla y Carteles Oficiales
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {CLUB_WALLPAPERS.map((wp) => (
              <div
                key={wp.id}
                className="bg-surface-container-lowest border border-white/5 p-4 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="relative h-48 w-full border border-white/10 overflow-hidden mb-3 bg-surface-container-high">
                    <Image
                      src={wp.imageUrl}
                      alt={wp.title}
                      fill
                      className={wp.imageUrl.includes('logo') ? 'object-contain p-3' : 'object-cover'}
                    />
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/80 text-white text-[10px] uppercase font-bold">
                      {wp.type}
                    </span>
                  </div>
                  <h4 className="font-headline-sm text-sm uppercase text-white font-bold leading-tight">
                    {wp.title}
                  </h4>
                  <span className="text-[11px] text-tertiary block mt-1">
                    {wp.dimensions}
                  </span>
                </div>

                <a
                  href={wp.downloadUrl}
                  download
                  className="w-full py-2.5 bg-surface-container-high hover:bg-primary-container text-white text-xs font-bold uppercase text-center flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-4 h-4" aria-hidden="true" />
                  <span>Descargar Gratis</span>
                </a>
              </div>
            ))}
          </div>
        </section>
      </div>

      <SponsorBanner customText="ÚNETE COMO COMERCIO PATROCINADOR DE LA AFICIÓN" />
    </div>
  );
}
