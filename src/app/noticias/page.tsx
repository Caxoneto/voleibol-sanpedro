'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { INITIAL_ARTICLES, store } from '@/lib/data-store';
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
    { label: 'Todas', value: 'ALL' },
    { label: 'Senior Masculino', value: 'cat-senior-masc-a' },
    { label: 'Cantera FAVB', value: 'cat-cantera' },
    { label: 'Institucional', value: 'cat-inst' },
  ];

  const filteredArticles = INITIAL_ARTICLES.filter((art) => {
    if (selectedCat === 'ALL') return true;
    return art.categoryId === selectedCat;
  });

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
    <div className="w-full min-h-screen bg-background">
      {/* Top Banner */}
      <section className="relative w-full bg-surface-container-lowest px-4 lg:px-8 py-12 border-b border-white/5 overflow-hidden">
        <div className="absolute -right-20 -top-24 w-96 h-96 rounded-full bg-primary-container/10 blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-primary-container text-white text-[11px] uppercase font-bold tracking-widest">
                SALA DE COMUNICACIÓN
              </span>
              <span className="text-xs text-tertiary uppercase tracking-wider">
                #VOLEIBOLSAMPEDRO
              </span>
            </div>
            <h1 className="font-display-xl text-4xl sm:text-5xl lg:text-6xl uppercase text-white tracking-tight leading-none">
              NOTICIAS Y PRENSA
            </h1>
            <p className="font-body-md text-sm sm:text-base text-tertiary max-w-2xl mt-2">
              Crónicas de los fines de semana, entrevistas a canteranos, avisos oficiales del club y acreditaciones para medios de comunicación.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <a
              href="#acreditacion"
              className="px-4 py-2.5 bg-primary-container hover:bg-secondary-container text-white font-label-md text-xs uppercase tracking-wider font-bold transition-all shadow-md"
            >
              Acreditación Prensa
            </a>
            <a
              href="#boletin"
              className="px-4 py-2.5 bg-surface-container-high hover:bg-surface-bright text-white font-label-md text-xs uppercase tracking-wider font-bold transition-all"
            >
              Boletín Oficial
            </a>
          </div>
        </div>
      </section>

      {/* Selector de Categorías */}
      <section className="sticky top-28 z-30 bg-surface/95 backdrop-blur-md border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3">
          <div className="flex items-center gap-2">
            {categories.map((c) => {
              const active = selectedCat === c.value;
              return (
                <button
                  key={c.value}
                  onClick={() => setSelectedCat(c.value)}
                  className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
                    active
                      ? 'bg-primary-container text-white shadow-[2px_2px_0px_0px_#0e0e0e]'
                      : 'bg-surface-container-high text-tertiary hover:text-white'
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Grid de Noticias */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredArticles.map((art) => (
            <article
              key={art.id}
              className="group bg-surface-container-low border border-white/5 hover:border-primary-container transition-all flex flex-col justify-between overflow-hidden shadow-lg hover:-translate-y-1"
            >
              <div>
                <div className="relative h-56 w-full overflow-hidden bg-surface-container-lowest">
                  <Image
                    src={art.coverImageUrl}
                    alt={art.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 bg-primary-container text-white text-[10px] font-bold uppercase tracking-wider">
                    {art.categoryName}
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center gap-2 text-xs text-tertiary mb-3">
                    <span>
                      {formatMadridDate(art.publishedAt, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span>•</span>
                    <span>{art.readingTimeMinutes} min de lectura</span>
                  </div>

                  <h3 className="font-display-xl text-xl uppercase text-white leading-snug group-hover:text-primary transition-colors">
                    {art.title}
                  </h3>

                  <p className="font-body-sm text-xs text-tertiary mt-3 line-clamp-3">
                    {art.excerpt}
                  </p>
                </div>
              </div>

              <div className="p-6 pt-0">
                <Link
                  href={`/noticias/${art.slug}`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary group-hover:text-white transition-colors"
                >
                  <span>Leer Crónica Completa</span>
                  <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* Sala de Prensa & Acreditaciones */}
      <section id="acreditacion" className="w-full bg-surface-container-high py-16 px-4 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Dossier e info medios */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <span className="text-xs text-primary font-bold uppercase tracking-wider">
                Recursos para Medios
              </span>
              <h2 className="font-display-xl text-3xl uppercase text-white mt-1">
                Sala de Prensa y Dossier
              </h2>
            </div>

            <p className="font-body-sm text-sm text-tertiary leading-relaxed">
              El C.D. Voleibol San Pedro facilita la labor informativa a redactores, emisoras de radio y fotógrafos deportivos locales. El acceso a la pista y cabinas de prensa en el Pabellón Sergio Scariolo se gestiona mediante solicitud de acreditación previa.
            </p>

            {/* Descarga Dossier Temporada */}
            <div className="p-5 bg-surface-container-lowest border border-white/10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[32px]">
                  description
                </span>
                <div>
                  <h4 className="font-headline-sm text-sm uppercase text-white font-bold">
                    Dossier Oficial Temporada 24/25
                  </h4>
                  <span className="text-xs text-tertiary">PDF • 14 Páginas • Historia, Plantillas y Sede</span>
                </div>
              </div>

              <a
                href="/images/logo.jpg"
                download="dossier-cdv-san-pedro.jpg"
                className="px-3 py-2 bg-primary-container hover:bg-secondary-container text-white text-xs font-bold uppercase shrink-0"
              >
                Descargar
              </a>
            </div>

            <div className="p-4 bg-surface-container-low border-l-4 border-primary-container text-xs text-tertiary">
              <strong className="text-white block mb-1">Contacto del Responsable de Prensa:</strong>
              Email: prensa@cdvoleibolsanpedro.es <br />
              Tel: +34 952 78 50 12 (Pabellón Sergio Scariolo)
            </div>
          </div>

          {/* Formulario de Solicitud de Acreditación */}
          <div className="lg:col-span-7 bg-surface-container-low border border-white/10 p-6 sm:p-8">
            <h3 className="font-display-xl text-xl uppercase text-white mb-1">
              Solicitud de Acreditación de Partido
            </h3>
            <p className="text-xs text-tertiary mb-6">
              Completa el formulario para reservar pase de pista y cabina de prensa en el próximo partido.
            </p>

            {accreditationSubmitted ? (
              <div className="p-6 bg-emerald-500/15 border border-emerald-500/30 text-center space-y-3">
                <span className="material-symbols-outlined text-4xl text-emerald-400">
                  check_circle
                </span>
                <h4 className="font-display-xl text-xl uppercase text-white">
                  ¡Solicitud Registrada con Éxito!
                </h4>
                <p className="text-xs text-tertiary">
                  El equipo de comunicación del club revisará tus datos y recibirás la confirmación oficial en tu correo electrónico.
                </p>
                <button
                  onClick={() => setAccreditationSubmitted(false)}
                  className="mt-2 px-4 py-2 bg-surface-container-high text-xs uppercase font-bold text-white hover:bg-surface-bright"
                >
                  Enviar otra solicitud
                </button>
              </div>
            ) : (
              <form onSubmit={handleAccreditationSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase font-bold text-tertiary mb-1">
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
                      className="w-full px-3 py-2 bg-surface-container-lowest border border-white/10 text-white text-xs focus:border-primary-container focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold text-tertiary mb-1">
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
                      className="w-full px-3 py-2 bg-surface-container-lowest border border-white/10 text-white text-xs focus:border-primary-container focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs uppercase font-bold text-tertiary mb-1">
                      Función
                    </label>
                    <select
                      value={accreditationForm.role}
                      onChange={(e) =>
                        setAccreditationForm({ ...accreditationForm, role: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-surface-container-lowest border border-white/10 text-white text-xs focus:border-primary-container focus:outline-none"
                    >
                      <option>Redactor / Periodista</option>
                      <option>Fotógrafo de Pista</option>
                      <option>Radio / Comentarista</option>
                      <option>Cámara / Vídeo</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold text-tertiary mb-1">
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
                      className="w-full px-3 py-2 bg-surface-container-lowest border border-white/10 text-white text-xs focus:border-primary-container focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase font-bold text-tertiary mb-1">
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
                      className="w-full px-3 py-2 bg-surface-container-lowest border border-white/10 text-white text-xs focus:border-primary-container focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase font-bold text-tertiary mb-1">
                    Observaciones o necesidades técnicas (Opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={accreditationForm.notes}
                    onChange={(e) =>
                      setAccreditationForm({ ...accreditationForm, notes: e.target.value })
                    }
                    placeholder="Ej. Necesidad de toma de corriente para retransmisión o acceso especial a pie de pista."
                    className="w-full px-3 py-2 bg-surface-container-lowest border border-white/10 text-white text-xs focus:border-primary-container focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-primary-container hover:bg-secondary-container text-white font-label-md text-xs uppercase font-bold tracking-wider transition-all shadow-[4px_4px_0px_0px_#0e0e0e]"
                >
                  Enviar Solicitud de Acreditación
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Suscripción al Boletín Informativo */}
      <section id="boletin" className="w-full py-16 px-4 lg:px-8 bg-surface-container-lowest border-t border-white/5">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <span className="material-symbols-outlined text-4xl text-primary animate-pulse">
            mail
          </span>
          <h2 className="font-display-xl text-3xl sm:text-4xl uppercase text-white">
            Boletín Semanal Sampedreño
          </h2>
          <p className="font-body-sm text-sm text-tertiary">
            Recibe cada viernes en tu correo la previa del fin de semana, convocatorias de la cantera y crónicas de los partidos disputados en el Sergio Scariolo.
          </p>

          <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3 pt-4">
            <input
              type="email"
              required
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="Introduce tu correo electrónico..."
              className="flex-1 px-4 py-3 bg-surface-container-high border border-white/10 text-white text-sm focus:border-primary-container focus:outline-none"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-primary-container hover:bg-secondary-container text-white font-label-md text-xs uppercase font-bold tracking-wider shrink-0 transition-all shadow-md"
            >
              Suscribirme Gratis
            </button>
          </form>

          {newsletterStatus && (
            <p className="text-xs text-emerald-400 font-semibold pt-2">
              {newsletterStatus}
            </p>
          )}
        </div>
      </section>

      <SponsorBanner />
    </div>
  );
}
