'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { store, CLUB_INFO } from '@/lib/data-store';
import { formatMadridDate } from '@/lib/date-utils';
import SponsorBanner from '@/components/SponsorBanner';

export default function NoticiasPage() {
  const [selectedCat, setSelectedCat] = useState<string>('ALL');
  const [accreditationSubmitted, setAccreditationSubmitted] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<string | null>(null);

  // Formulario de acreditación
  const [accreditationForm, setAccreditationForm] = useState({
    fullName: '',
    mediaOutlet: '',
    role: 'Prensa Escrita / Digital',
    email: '',
    phone: '',
    matchId: 'm-featured-1',
    notes: '',
  });

  const categories = [
    { label: 'Todas las noticias', value: 'ALL' },
    { label: 'Institucional y FAVB', value: 'cat-inst' },
    { label: 'Cantera FAVB', value: 'cat-cantera' },
    { label: 'Senior Masculino', value: 'cat-senior-masc-a' },
  ];

  const allArticles = store.getArticles();
  const filteredArticles = allArticles.filter((art) => {
    if (selectedCat === 'ALL') return true;
    return art.categoryId === selectedCat;
  });

  const featuredArticle = filteredArticles[0];
  const gridArticles = filteredArticles.slice(1);
  const upcomingMatch = store.getUpcomingMatches()[0] || store.getFeaturedMatch();

  const handleAccreditationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    store.addPressAccreditation(accreditationForm);
    setAccreditationSubmitted(true);
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail) return;
    const res = store.addNewsletterSubscriber(newsletterEmail);
    setNewsletterStatus(res.message);
    setNewsletterEmail('');
  };

  return (
    <div className="w-full min-h-screen bg-surface font-body-md text-on-surface antialiased">
      {/* Dynamic Atmospheric Header Ticker */}
      <section className="w-full bg-surface-container-lowest px-4 lg:px-12 py-2.5 border-b border-white/5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-primary-container text-on-primary font-label-sm text-label-sm uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              TEMPORADA 26/27
            </span>
            <p className="font-body-sm text-body-sm text-on-surface truncate">
              Ligas Federadas FAVB: 8 equipos de cantera y primer equipo compitiendo por San Pedro Alcántara.
            </p>
          </div>
          <div className="hidden lg:flex items-center gap-3 text-on-surface-variant font-label-sm text-label-sm">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-primary">campaign</span>
              SALA DE PRENSA
            </span>
            <span className="text-outline">/</span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px] text-primary">calendar_month</span>
              OCTUBRE 2026
            </span>
          </div>
        </div>
      </section>

      {/* Editorial Title & Interactive Tag Filter Bar */}
      <section className="w-full px-4 lg:px-12 pt-10 pb-6 bg-surface">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5 text-primary font-label-md text-label-md uppercase tracking-widest mb-1.5">
                <span className="material-symbols-outlined text-[18px]">sports_volleyball</span>
                <span>SALA DE COMUNICACIÓN & ACTUALIDAD</span>
              </div>
              <h1 className="font-headline-lg text-headline-lg uppercase text-on-surface tracking-tight">
                CRÓNICAS Y NOTICIAS ROJINEGRAS
              </h1>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
              Cobertura completa y actualizada de todas nuestras categorías: cantera formativa, compromisos federados FAVB y la vida institucional del C.D.V. San Pedro.
            </p>
          </div>

          {/* Filter Pills / Categories */}
          <div className="flex items-center gap-2 overflow-x-auto py-5 no-scrollbar mt-4 border-b border-white/5">
            {categories.map((c) => {
              const active = selectedCat === c.value;
              return (
                <button
                  key={c.value}
                  onClick={() => setSelectedCat(c.value)}
                  className={`shrink-0 px-4 py-2 font-label-md text-label-md uppercase tracking-wider transition-all ${
                    active
                      ? 'bg-primary-container text-on-primary shadow-md'
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
        <section className="w-full px-4 lg:px-12 pb-12 bg-surface">
          <div className="max-w-7xl mx-auto">
            <Link
              href={`/noticias/${featuredArticle.slug}`}
              className="block relative w-full bg-surface-container-low overflow-hidden group shadow-xl hover:bg-surface-container transition-colors border border-white/5 hover:border-primary-container"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
                {/* Hero Visual Presentation */}
                <div className="lg:col-span-7 relative h-72 lg:h-auto overflow-hidden bg-surface-container-lowest">
                  <Image
                    src={featuredArticle.coverImageUrl}
                    alt={featuredArticle.title}
                    fill
                    priority
                    className="object-contain lg:object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low via-surface-container-low/30 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-surface-container-low/30 lg:to-surface-container-low pointer-events-none" />

                  {/* Category Floating Ribbon */}
                  <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                    <span className="px-3 py-1 bg-primary-container text-on-primary font-label-md text-label-md uppercase tracking-wider shadow-lg">
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
                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                        {featuredArticle.readingTimeMinutes} MIN LECTURA
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">event</span>
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

                    <span className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-container text-on-primary font-label-lg text-label-lg uppercase tracking-wider group-hover:bg-secondary-container transition-all shadow-md">
                      <span>Leer Noticia Completa</span>
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Editorial Main Body: 3-Column News Mosaic + Media / Press Sidebar */}
      <section className="w-full px-4 lg:px-12 pb-16 bg-surface">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Primary Feed: Articles Grid (span 8 or 9) */}
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
              {(gridArticles.length > 0 ? gridArticles : filteredArticles).map((art) => (
                <Link
                  key={art.id}
                  href={`/noticias/${art.slug}`}
                  className="news-item flex flex-col bg-surface-container-low group overflow-hidden transition-all hover:bg-surface-container border border-white/5 hover:border-primary-container block shadow-lg hover:-translate-y-1"
                >
                  <div className="relative h-48 w-full overflow-hidden bg-surface-container-lowest">
                    <Image
                      src={art.coverImageUrl}
                      alt={art.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
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
                        <span className="material-symbols-outlined text-[14px]">timer</span>
                        {art.readingTimeMinutes} min
                      </span>
                      <span className="text-primary group-hover:text-white flex items-center gap-1 font-bold uppercase transition-colors">
                        <span>Leer</span>
                        <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                          chevron_right
                        </span>
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Right Editorial Sidebar (span 4 or 3) */}
          <aside className="lg:col-span-4 xl:col-span-3 flex flex-col gap-6">
            {/* Module 1: Sala de Prensa y Medios Oficiales */}
            <div className="p-6 bg-surface-container-low shadow-md border border-white/5">
              <div className="flex items-center gap-2 pb-2">
                <span className="material-symbols-outlined text-primary text-[22px]">newspaper</span>
                <h4 className="font-headline-sm text-headline-sm text-on-surface uppercase tracking-wide">
                  SALA DE PRENSA
                </h4>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-4 leading-relaxed">
                Recursos profesionales para periodistas acreditados, medios de radiodifusión y reporteros gráficos.
              </p>
              <div className="space-y-2">
                <a
                  href="/images/logo.jpg"
                  download="dossier-cdv-san-pedro.jpg"
                  className="p-3 bg-surface-container flex items-center justify-between hover:bg-surface-container-highest transition-colors border border-white/5"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">download</span>
                    <span className="font-label-md text-label-md uppercase text-on-surface font-bold">
                      Dossier de Prensa
                    </span>
                  </div>
                  <span className="font-label-sm text-[11px] text-outline">OFICIAL</span>
                </a>

                <a
                  href="#acreditacion"
                  className="p-3 bg-surface-container flex items-center justify-between hover:bg-surface-container-highest transition-colors border border-white/5"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">badge</span>
                    <span className="font-label-md text-label-md uppercase text-on-surface font-bold">
                      Acreditaciones de Partido
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant">arrow_downward</span>
                </a>

                <Link
                  href="/fan-zone"
                  className="p-3 bg-surface-container flex items-center justify-between hover:bg-surface-container-highest transition-colors border border-white/5"
                >
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[20px]">photo_library</span>
                    <span className="font-label-md text-label-md uppercase text-on-surface font-bold">
                      Galería Gráfica HD
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant">open_in_new</span>
                </Link>
              </div>

              <div className="mt-4 pt-3 bg-surface-container-lowest p-3 flex items-center gap-2 border border-white/5">
                <span className="material-symbols-outlined text-primary text-[18px]">mail</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                  Contacto: <strong className="text-on-surface">{CLUB_INFO.contactEmail}</strong>
                </span>
              </div>
            </div>

            {/* Module 2: Newsletter 'Boletín Rojinegro' */}
            <div id="boletin" className="p-6 bg-surface-container-low shadow-md relative overflow-hidden border border-white/5">
              <div className="absolute -right-12 -bottom-12 w-32 h-32 bg-primary-container/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-2 pb-1">
                <span className="material-symbols-outlined text-primary text-[22px]">mark_email_read</span>
                <h4 className="font-headline-sm text-headline-sm text-on-surface uppercase tracking-wide">
                  BOLETÍN ROJINEGRO
                </h4>
              </div>
              <span className="font-label-sm text-label-sm text-primary uppercase font-bold tracking-widest block mb-2">
                LA PASIÓN EN TU CORREO
              </span>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-4 leading-relaxed">
                Recibe la previa del fin de semana, convocatorias de cantera y crónicas de los partidos en el Sergio Scariolo.
              </p>
              <form onSubmit={handleNewsletterSubmit} className="space-y-2">
                <div className="relative">
                  <input
                    className="w-full bg-surface-container-lowest text-on-surface placeholder:text-outline font-body-sm text-body-sm px-4 py-3 focus:outline-none focus:border-primary-container border border-white/10 transition-all"
                    placeholder="Tu correo electrónico..."
                    required
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                  />
                </div>
                <button
                  className="w-full py-3 bg-primary-container hover:bg-secondary-container text-on-primary font-label-md text-label-md uppercase tracking-wider font-bold transition-all shadow-md flex items-center justify-center gap-2"
                  type="submit"
                >
                  <span className="material-symbols-outlined text-[18px]">send</span>
                  <span>SUSCRIBIRME GRATIS</span>
                </button>
              </form>
              {newsletterStatus && (
                <p className="text-xs text-emerald-400 font-semibold pt-2">
                  {newsletterStatus}
                </p>
              )}
              <span className="font-label-sm text-[10px] text-outline block mt-2">
                Cero spam. Cancela cuando desees con un clic.
              </span>
            </div>

            {/* Module 3: Próxima Cita en Casa */}
            {upcomingMatch && (
              <div className="p-6 bg-surface-container-low shadow-md border border-white/5">
                <div className="flex items-center justify-between pb-3">
                  <span className="font-label-sm text-label-sm text-primary uppercase font-bold tracking-widest">
                    PRÓXIMA CITA EN CASA
                  </span>
                  <span className="material-symbols-outlined text-outline text-[18px]">stadium</span>
                </div>
                <div className="bg-surface-container-high p-4 flex items-center justify-between gap-3 mb-3 border border-white/5">
                  <div className="text-center flex-1">
                    <span className="font-headline-sm text-headline-sm uppercase text-on-surface block truncate">
                      {upcomingMatch.homeTeamName.includes('San Pedro') ? 'CDV SP' : upcomingMatch.homeTeamName}
                    </span>
                    <span className="font-label-sm text-[10px] text-primary font-bold">LOCAL</span>
                  </div>
                  <span className="font-headline-md text-headline-md text-outline">VS</span>
                  <div className="text-center flex-1">
                    <span className="font-headline-sm text-headline-sm uppercase text-on-surface block truncate">
                      {upcomingMatch.awayTeamName.includes('San Pedro') ? 'CDV SP' : upcomingMatch.awayTeamName}
                    </span>
                    <span className="font-label-sm text-[10px] text-outline">VISITANTE</span>
                  </div>
                </div>
                <div className="text-center font-body-sm text-body-sm text-on-surface-variant">
                  {formatMadridDate(upcomingMatch.matchDate, {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}{' '}
                  • {formatMadridDate(upcomingMatch.matchDate, { hour: '2-digit', minute: '2-digit' })} h • {upcomingMatch.venueName}
                </div>
                <Link
                  href="/partidos"
                  className="mt-4 w-full py-2.5 bg-surface-container-highest hover:bg-surface-bright text-on-surface font-label-sm text-label-sm uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors border border-white/5"
                >
                  <span>VER CALENDARIO Y ENTRADAS</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </Link>
              </div>
            )}
          </aside>
        </div>
      </section>

      {/* Sala de Prensa & Acreditaciones Form Section */}
      <section id="acreditacion" className="w-full bg-surface-container-high py-16 px-4 lg:px-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Dossier e info medios */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <span className="text-xs text-primary font-bold uppercase tracking-wider font-label-sm">
                Recursos para Medios
              </span>
              <h2 className="font-headline-lg text-3xl uppercase text-on-surface mt-1">
                Sala de Prensa y Dossier
              </h2>
            </div>

            <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
              El C.D. Voleibol San Pedro facilita la labor informativa a redactores, emisoras de radio y fotógrafos deportivos. El acceso a pista y cabinas de prensa en el Pabellón Sergio Scariolo se gestiona mediante solicitud de acreditación previa.
            </p>

            {/* Descarga Dossier Temporada */}
            <div className="p-5 bg-surface-container-lowest border border-white/10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[32px]">
                  description
                </span>
                <div>
                  <h4 className="font-headline-sm text-sm uppercase text-on-surface font-bold">
                    Dossier Oficial Temporada 26/27
                  </h4>
                  <span className="text-xs text-tertiary font-body-sm">
                    PDF • Historia, Plantillas y Sede Pabellón Sergio Scariolo
                  </span>
                </div>
              </div>

              <a
                href="/images/logo.jpg"
                download="dossier-cdv-san-pedro.jpg"
                className="px-4 py-2.5 bg-primary-container hover:bg-secondary-container text-on-primary text-xs font-bold uppercase shrink-0 font-label-md"
              >
                Descargar
              </a>
            </div>

            <div className="p-4 bg-surface-container-low border-l-4 border-primary-container text-xs text-on-surface-variant font-body-sm">
              <strong className="text-on-surface block mb-1">Contacto del Responsable de Prensa:</strong>
              Email: {CLUB_INFO.contactEmail} <br />
              Tel: {CLUB_INFO.contactPhone} ({CLUB_INFO.venueName})
            </div>
          </div>

          {/* Formulario de Solicitud de Acreditación */}
          <div className="lg:col-span-7 bg-surface-container-low border border-white/10 p-6 sm:p-8">
            <h3 className="font-headline-sm text-xl uppercase text-on-surface mb-1 font-bold">
              Solicitud de Acreditación de Partido
            </h3>
            <p className="text-xs text-on-surface-variant mb-6 font-body-sm">
              Completa el formulario para reservar pase de pista y cabina de prensa en los próximos partidos de la FAVB.
            </p>

            {accreditationSubmitted ? (
              <div className="p-6 bg-emerald-500/15 border border-emerald-500/30 text-center space-y-3">
                <span className="material-symbols-outlined text-4xl text-emerald-400">
                  check_circle
                </span>
                <h4 className="font-headline-sm text-xl uppercase text-on-surface font-bold">
                  ¡Solicitud Registrada con Éxito!
                </h4>
                <p className="text-xs text-on-surface-variant font-body-sm">
                  El equipo de comunicación del club revisará tus datos y recibirás la confirmación oficial en tu correo electrónico.
                </p>
                <button
                  onClick={() => setAccreditationSubmitted(false)}
                  className="mt-2 px-4 py-2 bg-surface-container-high text-xs uppercase font-bold text-on-surface hover:bg-surface-bright"
                >
                  Enviar otra solicitud
                </button>
              </div>
            ) : (
              <form onSubmit={handleAccreditationSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase font-bold text-on-surface-variant mb-1 font-label-sm">
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      required
                      value={accreditationForm.fullName}
                      onChange={(e) =>
                        setAccreditationForm({ ...accreditationForm, fullName: e.target.value })
                      }
                      placeholder="Ej. Juan Gómez Ruiz"
                      className="w-full px-3 py-2 bg-surface-container-lowest border border-white/10 text-on-surface text-xs focus:border-primary-container focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold text-on-surface-variant mb-1 font-label-sm">
                      Medio de Comunicación / Freelance
                    </label>
                    <input
                      type="text"
                      required
                      value={accreditationForm.mediaOutlet}
                      onChange={(e) =>
                        setAccreditationForm({ ...accreditationForm, mediaOutlet: e.target.value })
                      }
                      placeholder="Ej. Diario Sur / Radio Marbella"
                      className="w-full px-3 py-2 bg-surface-container-lowest border border-white/10 text-on-surface text-xs focus:border-primary-container focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs uppercase font-bold text-on-surface-variant mb-1 font-label-sm">
                      Función
                    </label>
                    <select
                      value={accreditationForm.role}
                      onChange={(e) =>
                        setAccreditationForm({ ...accreditationForm, role: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-surface-container-lowest border border-white/10 text-on-surface text-xs focus:border-primary-container focus:outline-none"
                    >
                      <option>Redactor / Periodista</option>
                      <option>Fotógrafo de Pista</option>
                      <option>Radio / Comentarista</option>
                      <option>Cámara / Vídeo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold text-on-surface-variant mb-1 font-label-sm">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={accreditationForm.email}
                      onChange={(e) =>
                        setAccreditationForm({ ...accreditationForm, email: e.target.value })
                      }
                      placeholder="prensa@medio.es"
                      className="w-full px-3 py-2 bg-surface-container-lowest border border-white/10 text-on-surface text-xs focus:border-primary-container focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold text-on-surface-variant mb-1 font-label-sm">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      required
                      value={accreditationForm.phone}
                      onChange={(e) =>
                        setAccreditationForm({ ...accreditationForm, phone: e.target.value })
                      }
                      placeholder="+34 600 000 000"
                      className="w-full px-3 py-2 bg-surface-container-lowest border border-white/10 text-on-surface text-xs focus:border-primary-container focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold text-on-surface-variant mb-1 font-label-sm">
                    Observaciones o necesidades técnicas (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={accreditationForm.notes}
                    onChange={(e) =>
                      setAccreditationForm({ ...accreditationForm, notes: e.target.value })
                    }
                    placeholder="Ej. Necesidad de toma de corriente para retransmisión o acceso especial a pie de pista."
                    className="w-full px-3 py-2 bg-surface-container-lowest border border-white/10 text-on-surface text-xs focus:border-primary-container focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-primary-container hover:bg-secondary-container text-on-primary font-label-md text-xs uppercase font-bold tracking-wider transition-all shadow-md"
                >
                  Enviar Solicitud de Acreditación
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <SponsorBanner />
    </div>
  );
}
