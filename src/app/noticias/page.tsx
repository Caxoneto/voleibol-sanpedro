'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Images,
  Loader2,
  Mail,
  MapPin,
  Megaphone,
  Newspaper,
  Phone,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { INITIAL_ARTICLES } from '@/lib/data-store';
import { CLUB_CATEGORIES_META, CLUB_TEAMS_META, CLUB_INFO } from '@/lib/club-info';
import type { FavbMatch } from '@/lib/favb-scraper';
import { formatMadridDate } from '@/lib/date-utils';
import { getTeamLogo } from '@/lib/team-logos';
import { sanitizeHttpsUrl } from '@/lib/validators';
import { isRestMatch } from '@/lib/match-utils';
import SponsorBanner from '@/components/SponsorBanner';
import { InstagramIcon, FacebookIcon } from '@/components/SocialIcons';

const MATCHES_STORAGE_KEY = 'cdv_synced_matches_v7';
const PRESS_LEGAL_VERSION = 'v3_2026_rgpd_prensa';

export default function NoticiasPage() {
  const [selectedCat, setSelectedCat] = useState<string>('ALL');
  const [accreditationSubmitted, setAccreditationSubmitted] = useState(false);
  const [pressSubmitting, setPressSubmitting] = useState(false);
  const [pressError, setPressError] = useState<string | null>(null);
  const [showPressModal, setShowPressModal] = useState<boolean>(false);
  const [showPressRoom, setShowPressRoom] = useState<boolean>(false);
  const [upcomingMatch, setUpcomingMatch] = useState<FavbMatch | null>(null);
  const catScrollRef = useRef<HTMLDivElement | null>(null);
  const pressModalRef = useRef<HTMLDivElement | null>(null);
  const pressTriggerRef = useRef<HTMLButtonElement | null>(null);
  const wasPressModalOpenRef = useRef(false);

  // Formulario de acreditación conectado a Neon (/api/public/press)
  const [accreditationForm, setAccreditationForm] = useState({
    fullName: '',
    mediaOutlet: '',
    role: 'Redactor / Periodista',
    email: '',
    phone: '',
    matchId: 'general',
    notes: '',
    privacyAccepted: false,
    website: '', // Honeypot anti-bots
  });

  const categories = [
    { label: 'Todas las noticias', value: 'ALL' },
    { label: 'Competición y Resultados', value: 'cat-competicion' },
    { label: 'Club e Institucional', value: 'cat-club' },
    { label: 'Normativa y FAVB', value: 'cat-inst' },
  ];

  const allArticles = INITIAL_ARTICLES;
  const filteredArticles = allArticles.filter((art) => {
    if (selectedCat === 'ALL') return true;
    return art.categoryId === selectedCat;
  });

  const featuredArticle = filteredArticles[0];

  // Cargar próximo partido oficial sin ?force=true en cliente
  useEffect(() => {
    let cancelled = false;

    const pickNextMatch = (matches: FavbMatch[]): FavbMatch | null => {
      const upcoming = matches
        .filter((m) => !isRestMatch(m) && (m.status === 'SCHEDULED' || m.status === 'LIVE'))
        .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
      return upcoming.find((m) => m.isClubHome) || upcoming[0] || null;
    };

    try {
      const cached = localStorage.getItem(MATCHES_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as { matches?: FavbMatch[] };
        if (Array.isArray(parsed?.matches)) {
          const picked = pickNextMatch(parsed.matches);
          if (picked && !cancelled) setUpcomingMatch(picked);
        }
      }
    } catch {
      // Ignorar caché ilegible o bloqueada
    }

    fetch('/api/favb/sync')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.success && Array.isArray(data.matches)) {
          const picked = pickNextMatch(data.matches);
          if (picked) setUpcomingMatch(picked);
        }
      })
      .catch(() => {
        // Silencioso en caso de fallo de red puntual
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const upcomingTeam = upcomingMatch
    ? CLUB_TEAMS_META.find((t) => t.id === upcomingMatch.teamId)
    : undefined;
  const upcomingCategory = upcomingTeam
    ? CLUB_CATEGORIES_META.find((c) => c.id === upcomingTeam.categoryId)
    : upcomingMatch
      ? CLUB_CATEGORIES_META.find((c) => c.id === upcomingMatch.categoryId)
      : undefined;
  const upcomingCatId = upcomingCategory?.id || 'cat-senior-fem';

  const handleAccreditationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPressError(null);

    if (!accreditationForm.privacyAccepted) {
      setPressError('Debes aceptar expresamente la Política de Privacidad para continuar.');
      return;
    }

    setPressSubmitting(true);
    try {
      const res = await fetch('/api/public/press', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: accreditationForm.fullName.trim(),
          mediaOutlet: accreditationForm.mediaOutlet.trim(),
          role: accreditationForm.role,
          email: accreditationForm.email.trim(),
          phone: accreditationForm.phone.trim(),
          matchId: upcomingMatch?.id || accreditationForm.matchId || 'general',
          notes: accreditationForm.notes.trim(),
          privacyAccepted: accreditationForm.privacyAccepted,
          legalVersion: PRESS_LEGAL_VERSION,
          website: accreditationForm.website,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setPressError(data?.error || 'No se pudo enviar la solicitud. Revisa los datos e inténtalo de nuevo.');
        return;
      }

      setAccreditationSubmitted(true);
      setAccreditationForm({
        fullName: '',
        mediaOutlet: '',
        role: 'Redactor / Periodista',
        email: '',
        phone: '',
        matchId: 'general',
        notes: '',
        privacyAccepted: false,
        website: '',
      });
    } catch {
      setPressError('Error de conexión con el servidor. Inténtalo de nuevo en unos instantes.');
    } finally {
      setPressSubmitting(false);
    }
  };

  // Focus trap, cierre con Escape y restauración de foco en modal de acreditación
  useEffect(() => {
    if (showPressModal) {
      wasPressModalOpenRef.current = true;
      const modal = pressModalRef.current;
      if (modal) {
        const focusable = modal.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        focusable[0]?.focus();
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setShowPressModal(false);
          return;
        }
        if (e.key === 'Tab' && pressModalRef.current) {
          const focusable = Array.from(
            pressModalRef.current.querySelectorAll<HTMLElement>(
              'button:not([disabled]), [href], input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
          );
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey) {
            if (document.activeElement === first || !pressModalRef.current.contains(document.activeElement)) {
              e.preventDefault();
              last.focus();
            }
          } else if (document.activeElement === last || !pressModalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }

    if (wasPressModalOpenRef.current) {
      wasPressModalOpenRef.current = false;
      pressTriggerRef.current?.focus();
    }
  }, [showPressModal]);

  // Centrar categoría seleccionada en el carrusel horizontal
  useEffect(() => {
    const container = catScrollRef.current;
    const pill = document.getElementById(`noticias-cat-pill-${selectedCat}`);
    if (container && pill) {
      const targetLeft = pill.offsetLeft - (container.clientWidth - pill.clientWidth) / 2;
      const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
      container.scrollTo({ left: Math.max(0, Math.min(maxScroll, targetLeft)), behavior: 'smooth' });
    }
  }, [selectedCat]);

  const safeInstagramUrl = sanitizeHttpsUrl(CLUB_INFO.instagramUrl, 'https://www.instagram.com/voleibolsanpedro/');
  const safeFacebookUrl = sanitizeHttpsUrl(CLUB_INFO.facebookUrl, 'https://www.facebook.com/');

  return (
    <div className="relative overflow-hidden w-full min-h-screen bg-surface pb-20 font-body-md text-on-surface antialiased">
      {/* Ambient Background Image (Pabellón Sergio Scariolo) */}
      <div className="pointer-events-none absolute top-0 inset-x-0 h-[620px] sm:h-[720px] overflow-hidden z-0">
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center mix-blend-luminosity opacity-40 blur-[2px] scale-105 animate-hero-bg transition-transform duration-1000"
          style={{ backgroundImage: "url('/images/pabellon-sergio-scariolo.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-surface via-surface/85 to-transparent" />
        <div className="absolute -top-32 left-1/4 w-96 h-96 bg-primary-container/20 rounded-full blur-[140px]" />
      </div>

      {/* Dynamic Atmospheric Header Ticker */}
      <section className="relative z-10 w-full bg-surface-container-lowest px-4 lg:px-12 py-2.5 border-b border-white/5 overflow-hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 text-xs min-w-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-primary-container text-white font-label-sm text-label-sm uppercase tracking-wider shrink-0">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              TEMPORADA 26/27
            </span>
            <p className="font-body-sm text-body-sm text-on-surface truncate min-w-0">
              Ligas Federadas FAVB: cantera y primeros equipos compitiendo por San Pedro Alcántara.
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-3 text-on-surface-variant font-label-sm text-label-sm">
            <span className="flex items-center gap-1">
              <Megaphone className="w-4 h-4 text-primary" aria-hidden="true" />
              SALA DE PRENSA
            </span>
            <span className="text-outline">/</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4 text-primary" aria-hidden="true" />
              TEMPORADA 2026/2027
            </span>
          </div>
        </div>
      </section>

      {/* Editorial Title & Interactive Tag Filter Bar */}
      <section className="relative z-10 w-full px-4 lg:px-12 pt-6 sm:pt-10 pb-4 sm:pb-6 bg-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-primary font-label-md text-label-md uppercase tracking-widest mb-1.5">
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                <span>SALA DE COMUNICACIÓN &amp; ACTUALIDAD</span>
              </div>
              <h1 className="font-display-xl text-4xl sm:text-5xl lg:text-6xl uppercase tracking-tight leading-none">
                <span className="text-white">CRÓNICAS Y </span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-container via-red-500 to-secondary-fixed-dim">
                  NOTICIAS ROJINEGRAS
                </span>
              </h1>
            </div>
            <p className="hidden md:block font-body-md text-body-md text-on-surface-variant max-w-md">
              Cobertura completa y actualizada de todas nuestras categorías: cantera formativa, compromisos federados FAVB y la vida institucional del C.D.V. San Pedro.
            </p>
          </div>

          {/* Filter Pills / Categories */}
          <div
            ref={catScrollRef}
            className="flex items-center gap-2 overflow-x-auto py-3 sm:py-4 category-scrollbar scroll-smooth snap-x snap-mandatory mt-3 sm:mt-4 border-b border-white/5"
          >
            {categories.map((c) => {
              const active = selectedCat === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  id={`noticias-cat-pill-${c.value}`}
                  onClick={() => setSelectedCat(c.value)}
                  aria-pressed={active}
                  className={`w-auto snap-start flex items-center justify-center text-center shrink-0 px-4 py-2 font-label-md text-xs sm:text-label-md uppercase tracking-wider whitespace-nowrap transition-all ${
                    active
                      ? 'bg-primary-container text-white shadow-md font-bold'
                      : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Big Hero Feature Card (Main Story) */}
      {featuredArticle && (
        <section className="relative z-10 w-full px-4 lg:px-12 pb-12 bg-transparent">
          <div className="max-w-7xl mx-auto">
            <Link
              href={`/noticias/${featuredArticle.slug}`}
              className="block relative w-full bg-surface-container-low overflow-hidden group shadow-xl hover:bg-surface-container transition-colors border border-white/5 hover:border-primary-container"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
                {/* Hero Visual Presentation */}
                <div className="lg:col-span-7 relative h-72 sm:h-96 lg:h-auto overflow-hidden bg-surface-container-lowest">
                  <Image
                    src={featuredArticle.coverImageUrl}
                    alt={featuredArticle.title}
                    fill
                    priority
                    className={`${featuredArticle.coverImageUrl.includes('loteria') ? 'object-contain' : 'object-cover object-center'} transition-transform duration-700 group-hover:scale-105`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-surface-container-low/30 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-surface-container-low/30 lg:to-surface-container-low pointer-events-none" />

                  {/* Category Floating Ribbon */}
                  <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                    <span className="px-3 py-1 bg-primary-container text-white font-label-md text-label-md uppercase font-bold tracking-wider shadow-lg">
                      {featuredArticle.categoryName}
                    </span>
                    <span className="px-3 py-1 bg-surface-container-lowest/90 backdrop-blur text-primary font-label-sm text-label-sm uppercase tracking-wider">
                      DESTACADO
                    </span>
                  </div>
                </div>

                {/* Hero Content / Storyline Details */}
                <div className="lg:col-span-5 p-6 lg:p-8 flex flex-col justify-between bg-surface-container-low">
                  <div>
                    <div className="flex items-center gap-2 text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider mb-3">
                      <span className="flex items-center gap-1 text-primary">
                        <Clock className="w-4 h-4" aria-hidden="true" />
                        {featuredArticle.readingTimeMinutes} MIN LECTURA
                      </span>
                      <span aria-hidden="true">•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" aria-hidden="true" />
                        {formatMadridDate(featuredArticle.publishedAt, {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <h2 className="font-headline-lg text-2xl lg:text-3xl text-on-surface uppercase leading-tight tracking-tight mb-4 group-hover:text-primary transition-colors">
                      {featuredArticle.title}
                    </h2>

                    <p className="font-body-lg text-body-lg text-on-surface-variant mb-6 line-clamp-4 leading-relaxed font-normal">
                      {featuredArticle.excerpt}
                    </p>

                    {/* Quick Highlight Box */}
                    <div className="p-4 bg-surface-container-high border border-white/5 mb-6">
                      <div className="flex items-center justify-between text-on-surface font-label-sm text-label-sm uppercase mb-1">
                        <span className="text-primary font-bold">ACTUALIDAD DEL CLUB</span>
                        <span className="text-on-surface-variant">OFICIAL</span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        Consulta todos los detalles, documentación oficial y cómo participar activamente con el club.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-surface-container-highest flex items-center justify-center font-headline-md text-primary font-bold">
                        SP
                      </div>
                      <div className="flex flex-col">
                        <span className="font-label-md text-label-md text-on-surface uppercase">
                          Comunicación Oficial
                        </span>
                        <span className="font-body-sm text-body-sm text-outline">
                          C.D. Voleibol San Pedro
                        </span>
                      </div>
                    </div>

                    <span className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-container group-hover:bg-cta-hover text-white font-label-lg text-label-lg uppercase tracking-wider transition-all shadow-md font-bold">
                      <span>Leer Noticia Completa</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Editorial Main Body: 3-Column News Mosaic + Media / Press Sidebar */}
      <section className="relative z-10 w-full px-4 lg:px-12 pb-16 bg-surface">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Primary Feed: Articles Grid */}
          <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 bg-primary-container inline-block" />
                <h3 className="font-headline-md text-headline-md uppercase text-on-surface tracking-wide">
                  HISTORIAS RECIENTES DEL CLUB
                </h3>
              </div>
              <span className="font-label-sm text-label-sm uppercase text-outline hidden sm:block">
                {filteredArticles.length} ARTÍCULOS EN TOTAL
              </span>
            </div>

            {/* Articles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredArticles.map((art) => (
                <Link
                  key={art.id}
                  href={`/noticias/${art.slug}`}
                  className="news-item flex flex-col bg-surface-container-low group overflow-hidden transition-all hover:bg-surface-container border border-white/5 hover:border-primary-container block shadow-lg hover:-translate-y-1"
                >
                  <div className="relative h-52 w-full overflow-hidden bg-surface-container-lowest">
                    <Image
                      src={art.coverImageUrl}
                      alt={art.title}
                      fill
                      className={`${art.coverImageUrl.includes('loteria') ? 'object-contain p-2' : 'object-cover object-center'} transition-transform duration-500 group-hover:scale-105`}
                    />
                    <span className="absolute top-3 left-3 px-2.5 py-1 bg-surface-container-lowest/90 font-label-sm text-label-sm text-primary uppercase font-bold tracking-wider">
                      {art.categoryName}
                    </span>
                    <span className="absolute bottom-3 right-3 px-2 py-0.5 bg-surface-container-lowest/80 text-on-surface-variant font-label-sm text-[10px]">
                      {formatMadridDate(art.publishedAt, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  <div className="p-5 flex flex-col flex-1 justify-between">
                    <div>
                      <span className="font-label-sm text-label-sm text-primary uppercase tracking-wider block mb-1">
                        ACTUALIDAD
                      </span>
                      <h4 className="font-headline-sm text-headline-sm text-on-surface uppercase group-hover:text-primary transition-colors leading-snug line-clamp-2">
                        {art.title}
                      </h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 line-clamp-3 leading-relaxed">
                        {art.excerpt}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                        {art.readingTimeMinutes} min
                      </span>
                      <span className="text-primary group-hover:text-white flex items-center gap-1 font-bold uppercase transition-colors">
                        <span>Leer</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Right Editorial Sidebar */}
          <aside className="lg:col-span-4 xl:col-span-3 flex flex-col gap-6">
            {/* Module 1: Sala de Prensa y Medios Oficiales (Desplegable) */}
            <div id="acreditacion" className="bg-surface-container-low shadow-md border border-white/5">
              <button
                type="button"
                onClick={() => setShowPressRoom((prev) => !prev)}
                aria-expanded={showPressRoom}
                aria-controls="press-room-panel"
                className="w-full p-5 sm:p-6 flex items-center justify-between gap-3 text-left group hover:bg-surface-container transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Newspaper className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
                  <div>
                    <h4 className="font-headline-sm text-headline-sm text-on-surface uppercase tracking-wide group-hover:text-primary transition-colors">
                      SALA DE PRENSA
                    </h4>
                    <span className="text-[11px] text-on-surface-variant block">
                      Acreditaciones y recursos para medios
                    </span>
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-on-surface-variant transition-transform duration-200 shrink-0 ${
                    showPressRoom ? 'rotate-180 text-primary' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>

              {showPressRoom && (
                <div id="press-room-panel" className="px-5 sm:px-6 pb-5 sm:pb-6 pt-2 border-t border-white/5 animate-fade-in">
                  <p className="font-body-sm text-body-sm text-on-surface-variant mb-4 leading-relaxed">
                    Recursos profesionales para periodistas acreditados, medios de radiodifusión y reporteros gráficos en el Pabellón Sergio Scariolo.
                  </p>
                  <div className="space-y-2">
                    <button
                      ref={pressTriggerRef}
                      type="button"
                      onClick={() => {
                        setPressError(null);
                        setAccreditationSubmitted(false);
                        setShowPressModal(true);
                      }}
                      className="w-full p-3 bg-surface-container flex items-center justify-between hover:bg-surface-container-highest transition-colors border border-white/5 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <BadgeCheck className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
                        <span className="font-label-md text-label-md uppercase text-on-surface font-bold">
                          Acreditaciones de Partido
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-on-surface-variant shrink-0" aria-hidden="true" />
                    </button>

                    <Link
                      href="/fan-zone"
                      className="p-3 bg-surface-container flex items-center justify-between hover:bg-surface-container-highest transition-colors border border-white/5"
                    >
                      <div className="flex items-center gap-2">
                        <Images className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
                        <span className="font-label-md text-label-md uppercase text-on-surface font-bold">
                          Fan-Zone del Club
                        </span>
                      </div>
                      <ExternalLink className="w-4 h-4 text-on-surface-variant shrink-0" aria-hidden="true" />
                    </Link>
                  </div>

                  <div className="mt-4 pt-3 bg-surface-container-lowest p-3 space-y-1.5 border border-white/5 text-xs text-on-surface-variant">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                      <a href={`mailto:${CLUB_INFO.contactEmail}`} className="truncate hover:text-white transition-colors">
                        Contacto: <strong className="text-on-surface">{CLUB_INFO.contactEmail}</strong>
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                      <span>
                        Tel: <strong className="text-on-surface font-mono">{CLUB_INFO.contactPhone}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Module 2: Canales Oficiales de Información (Sin formulario mock) */}
            <div id="canales-oficiales" className="p-6 bg-surface-container-low shadow-md relative overflow-hidden border border-white/5">
              <div className="absolute -right-12 -bottom-12 w-32 h-32 bg-primary-container/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-2 pb-1">
                <Megaphone className="w-5 h-5 text-primary shrink-0" aria-hidden="true" />
                <h4 className="font-headline-sm text-headline-sm text-on-surface uppercase tracking-wide">
                  CANAL OFICIAL DEL CLUB
                </h4>
              </div>
              <span className="font-label-sm text-label-sm text-primary uppercase font-bold tracking-widest block mb-2">
                ACTUALIDAD AL INSTANTE
              </span>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-4 leading-relaxed">
                Sigue las previas del fin de semana, horarios FAVB actualizados y crónicas en directo a través de nuestros canales verificados.
              </p>
              <div className="space-y-2.5">
                <a
                  href={safeInstagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-[#833ab4] via-[#c13584] to-[#b8004c] hover:opacity-95 text-white font-label-md text-label-md uppercase tracking-wider font-bold transition-all shadow-md flex items-center justify-center gap-2"
                >
                  <InstagramIcon className="w-4 h-4 text-white" />
                  <span>Instagram Oficial</span>
                </a>
                <a
                  href={safeFacebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 bg-[#1877F2] hover:bg-[#166fe5] text-white font-label-md text-label-md uppercase tracking-wider font-bold transition-colors shadow-md flex items-center justify-center gap-2"
                >
                  <FacebookIcon className="w-4 h-4 text-white" />
                  <span>Facebook del Club</span>
                </a>
                <a
                  href={`mailto:${CLUB_INFO.contactEmail}?subject=${encodeURIComponent('Consulta de Comunicación / Noticias - C.D.V. San Pedro')}`}
                  className="w-full py-2.5 px-4 bg-surface-container-high hover:bg-surface-bright text-on-surface border border-white/10 font-label-md text-label-md uppercase tracking-wider font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Mail className="w-4 h-4 text-primary" aria-hidden="true" />
                  <span>Escribir a Secretaría</span>
                </a>
              </div>
              <span className="font-label-sm text-[10px] text-outline block mt-3">
                Información institucional directa · {CLUB_INFO.contactEmail}
              </span>
            </div>

            {/* Module 3: Próxima Cita Oficial (Datos reales FAVB) */}
            {upcomingMatch && (
              <div className="p-5 sm:p-6 bg-surface-container-low shadow-md border border-white/5 overflow-hidden">
                <div className="flex items-center justify-between pb-3">
                  <span className="font-label-sm text-label-sm text-primary uppercase font-bold tracking-widest">
                    {upcomingMatch.isClubHome ? 'PRÓXIMA CITA EN CASA' : 'PRÓXIMA CITA OFICIAL'}
                  </span>
                  <MapPin className="w-4 h-4 text-outline" aria-hidden="true" />
                </div>

                {upcomingCategory && (
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 bg-primary-container/20 border border-primary-container/40 text-primary text-[10px] font-bold uppercase tracking-wider truncate">
                      {upcomingCategory.name}
                    </span>
                    <span className="text-[10px] font-mono text-tertiary uppercase shrink-0">
                      Jornada {upcomingMatch.round}
                    </span>
                  </div>
                )}

                <div className="bg-surface-container-high p-3.5 mb-3 border border-white/5 space-y-2.5 overflow-hidden">
                  {/* Equipo Local */}
                  <div className="flex items-center justify-between gap-2.5 min-w-0">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Image
                        src={getTeamLogo(upcomingMatch.homeTeam)}
                        alt={upcomingMatch.homeTeam}
                        width={28}
                        height={28}
                        className="w-7 h-7 object-contain shrink-0"
                      />
                      {upcomingMatch.isClubHome ? (
                        <Link
                          href={`/plantillas?categoria=${upcomingCatId}`}
                          className="font-headline-sm text-xs sm:text-sm uppercase font-bold text-primary hover:underline decoration-primary underline-offset-2 truncate"
                          title={`Ver plantilla de ${upcomingCategory?.name || 'nuestro equipo'}`}
                        >
                          {upcomingMatch.homeTeam}
                        </Link>
                      ) : (
                        <span className="font-headline-sm text-xs sm:text-sm uppercase font-bold text-on-surface truncate">
                          {upcomingMatch.homeTeam}
                        </span>
                      )}
                    </div>
                    <span className="font-label-sm text-[9px] px-1.5 py-0.5 bg-primary-container/20 text-primary font-bold uppercase shrink-0">
                      LOCAL
                    </span>
                  </div>

                  {/* Separador VS */}
                  <div className="flex items-center gap-2">
                    <div className="h-px bg-white/10 flex-1" />
                    <span className="font-display-xl text-xs text-outline uppercase tracking-widest px-1">
                      VS
                    </span>
                    <div className="h-px bg-white/10 flex-1" />
                  </div>

                  {/* Equipo Visitante */}
                  <div className="flex items-center justify-between gap-2.5 min-w-0">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Image
                        src={getTeamLogo(upcomingMatch.awayTeam)}
                        alt={upcomingMatch.awayTeam}
                        width={28}
                        height={28}
                        className="w-7 h-7 object-contain shrink-0"
                      />
                      {!upcomingMatch.isClubHome ? (
                        <Link
                          href={`/plantillas?categoria=${upcomingCatId}`}
                          className="font-headline-sm text-xs sm:text-sm uppercase font-bold text-primary hover:underline decoration-primary underline-offset-2 truncate"
                          title={`Ver plantilla de ${upcomingCategory?.name || 'nuestro equipo'}`}
                        >
                          {upcomingMatch.awayTeam}
                        </Link>
                      ) : (
                        <span className="font-headline-sm text-xs sm:text-sm uppercase font-bold text-on-surface truncate">
                          {upcomingMatch.awayTeam}
                        </span>
                      )}
                    </div>
                    <span className="font-label-sm text-[9px] px-1.5 py-0.5 bg-white/5 text-outline font-bold uppercase shrink-0">
                      VISITANTE
                    </span>
                  </div>
                </div>

                <div className="text-center font-body-sm text-xs text-on-surface-variant leading-relaxed">
                  {formatMadridDate(upcomingMatch.matchDate, {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}{' '}
                  • {formatMadridDate(upcomingMatch.matchDate, { hour: '2-digit', minute: '2-digit' })} h •{' '}
                  {upcomingMatch.venue || 'Pabellón Sergio Scariolo'}
                </div>
                <Link
                  href={`/partidos?categoria=${upcomingCatId}&match=${upcomingMatch.id}`}
                  className="mt-4 w-full py-2.5 bg-surface-container-highest hover:bg-surface-bright text-on-surface font-label-sm text-label-sm uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors border border-white/5"
                >
                  <span>VER CALENDARIO Y PARTIDOS</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>
            )}
          </aside>
        </div>
      </section>

      {/* Modal: Solicitud de Acreditación de Prensa */}
      {showPressModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="press-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
        >
          <div
            ref={pressModalRef}
            className="bg-surface-container-low border-2 border-primary-container p-6 sm:p-8 max-w-xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto"
          >
            <button
              type="button"
              onClick={() => setShowPressModal(false)}
              className="absolute top-4 right-4 p-1.5 text-tertiary hover:text-white transition-colors"
              aria-label="Cerrar solicitud de acreditación"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>

            <h3 id="press-modal-title" className="font-headline-sm text-xl uppercase text-on-surface mb-1 font-bold pr-8">
              Solicitud de Acreditación de Partido
            </h3>
            <p className="text-xs text-on-surface-variant mb-6 font-body-sm">
              Completa el formulario para reservar pase de pista y cabina de prensa en los próximos partidos de la FAVB.
            </p>

            {accreditationSubmitted ? (
              <div className="p-6 bg-emerald-500/15 border border-emerald-500/30 text-center space-y-3" role="status">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" aria-hidden="true" />
                <h4 className="font-headline-sm text-xl uppercase text-on-surface font-bold">
                  ¡Solicitud Registrada con Éxito!
                </h4>
                <p className="text-xs text-on-surface-variant font-body-sm">
                  El equipo de comunicación del club revisará tus datos y recibirás la confirmación oficial en tu correo electrónico.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setAccreditationSubmitted(false);
                    setShowPressModal(false);
                  }}
                  className="mt-2 px-5 py-2.5 bg-surface-container-high text-xs uppercase font-bold text-on-surface hover:bg-surface-bright transition-colors"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={handleAccreditationSubmit} className="space-y-4">
                {/* Campo honeypot invisible para bots */}
                <div className="sr-only" aria-hidden="true">
                  <label htmlFor="press-website-hp">Sitio web</label>
                  <input
                    id="press-website-hp"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={accreditationForm.website}
                    onChange={(e) =>
                      setAccreditationForm({ ...accreditationForm, website: e.target.value })
                    }
                  />
                </div>

                {pressError && (
                  <div
                    role="alert"
                    className="p-3 bg-red-950/70 border border-red-500/50 text-red-200 text-xs flex items-start gap-2"
                  >
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{pressError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="press-fullname" className="block text-xs uppercase font-bold text-on-surface-variant mb-1 font-label-sm">
                      Nombre Completo
                    </label>
                    <input
                      id="press-fullname"
                      type="text"
                      required
                      maxLength={120}
                      value={accreditationForm.fullName}
                      onChange={(e) =>
                        setAccreditationForm({ ...accreditationForm, fullName: e.target.value })
                      }
                      placeholder="Ej. Juan Gómez Ruiz"
                      className="w-full px-3 py-2.5 bg-surface-container-lowest border border-white/10 text-on-surface text-base sm:text-xs focus:border-primary-container focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="press-media" className="block text-xs uppercase font-bold text-on-surface-variant mb-1 font-label-sm">
                      Medio de Comunicación / Freelance
                    </label>
                    <input
                      id="press-media"
                      type="text"
                      required
                      maxLength={120}
                      value={accreditationForm.mediaOutlet}
                      onChange={(e) =>
                        setAccreditationForm({ ...accreditationForm, mediaOutlet: e.target.value })
                      }
                      placeholder="Ej. Diario Sur / Radio Marbella"
                      className="w-full px-3 py-2.5 bg-surface-container-lowest border border-white/10 text-on-surface text-base sm:text-xs focus:border-primary-container focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="press-role" className="block text-xs uppercase font-bold text-on-surface-variant mb-1 font-label-sm">
                      Función
                    </label>
                    <select
                      id="press-role"
                      value={accreditationForm.role}
                      onChange={(e) =>
                        setAccreditationForm({ ...accreditationForm, role: e.target.value })
                      }
                      className="w-full px-3 py-2.5 bg-surface-container-lowest border border-white/10 text-on-surface text-base sm:text-xs focus:border-primary-container focus:outline-none"
                    >
                      <option value="Redactor / Periodista">Redactor / Periodista</option>
                      <option value="Fotógrafo de Pista">Fotógrafo de Pista</option>
                      <option value="Radio / Comentarista">Radio / Comentarista</option>
                      <option value="Cámara / Vídeo">Cámara / Vídeo</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="press-email" className="block text-xs uppercase font-bold text-on-surface-variant mb-1 font-label-sm">
                      Email
                    </label>
                    <input
                      id="press-email"
                      type="email"
                      required
                      value={accreditationForm.email}
                      onChange={(e) =>
                        setAccreditationForm({ ...accreditationForm, email: e.target.value })
                      }
                      placeholder="prensa@medio.es"
                      className="w-full px-3 py-2.5 bg-surface-container-lowest border border-white/10 text-on-surface text-base sm:text-xs focus:border-primary-container focus:outline-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="press-phone" className="block text-xs uppercase font-bold text-on-surface-variant mb-1 font-label-sm">
                      Teléfono
                    </label>
                    <input
                      id="press-phone"
                      type="tel"
                      required
                      maxLength={30}
                      value={accreditationForm.phone}
                      onChange={(e) =>
                        setAccreditationForm({ ...accreditationForm, phone: e.target.value })
                      }
                      placeholder="+34 600 000 000"
                      className="w-full px-3 py-2.5 bg-surface-container-lowest border border-white/10 text-on-surface text-base sm:text-xs focus:border-primary-container focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="press-notes" className="block text-xs uppercase font-bold text-on-surface-variant mb-1 font-label-sm">
                    Observaciones o necesidades técnicas (Opcional)
                  </label>
                  <textarea
                    id="press-notes"
                    rows={2}
                    maxLength={1500}
                    value={accreditationForm.notes}
                    onChange={(e) =>
                      setAccreditationForm({ ...accreditationForm, notes: e.target.value })
                    }
                    placeholder="Ej. Necesidad de toma de corriente para retransmisión o acceso especial a pie de pista."
                    className="w-full px-3 py-2.5 bg-surface-container-lowest border border-white/10 text-on-surface text-base sm:text-xs focus:border-primary-container focus:outline-none"
                  />
                </div>

                {/* Primera capa Art. 13 RGPD + Casilla obligatoria sin premarcar */}
                <div className="p-3 bg-surface-container-lowest border border-white/10 space-y-2.5 text-[11px] text-on-surface-variant leading-relaxed">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                    <p>
                      Responsable: SAN PEDRO C.D VOLEIBOL (CIF G93147924) · Finalidad: gestionar tu solicitud · Base: consentimiento expreso (Art. 6.1.a RGPD) · Conservación: máx. 12 meses tras el cierre de la gestión · Encargados: Neon EU / Zoho Mail EU / Netlify (DPF-SCC) · Derechos y revocación:{' '}
                      <a href={`mailto:${CLUB_INFO.contactEmail}`} className="text-primary underline hover:text-white">
                        {CLUB_INFO.contactEmail}
                      </a>.
                    </p>
                  </div>
                  <label htmlFor="press-privacy" className="flex items-start gap-2.5 cursor-pointer text-xs text-on-surface pt-1">
                    <input
                      id="press-privacy"
                      type="checkbox"
                      required
                      checked={accreditationForm.privacyAccepted}
                      onChange={(e) =>
                        setAccreditationForm({ ...accreditationForm, privacyAccepted: e.target.checked })
                      }
                      className="mt-0.5 w-4 h-4 accent-[#d90429] shrink-0 cursor-pointer"
                    />
                    <span>
                      He leído y acepto la{' '}
                      <Link
                        href="/privacidad"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline hover:text-white font-semibold"
                      >
                        Política de Privacidad
                      </Link>{' '}
                      para el tratamiento de mis datos con el fin de tramitar esta solicitud.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={pressSubmitting}
                  className="w-full py-3 bg-primary-container hover:bg-cta-hover disabled:opacity-60 text-white font-label-md text-xs uppercase font-bold tracking-wider transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {pressSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      <span>Enviando solicitud...</span>
                    </>
                  ) : (
                    <span>Enviar Solicitud de Acreditación</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <div className="relative z-10">
        <SponsorBanner />
      </div>
    </div>
  );
}
