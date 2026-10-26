'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CLUB_INFO, CURRENT_SPONSORS } from '@/lib/data-store';
import CookieSettingsButton from '@/components/CookieSettingsButton';
import { InstagramIcon, FacebookIcon, WhatsAppIcon } from '@/components/SocialIcons';
import { useStreaming } from '@/lib/use-streaming';
import StreamingModal from '@/components/StreamingModal';

type FooterSectionKey = 'club' | 'sede' | 'enlaces' | 'apoya';

export default function Footer() {
  const { status: streamingStatus, updateLocalStatus } = useStreaming();
  const [isStreamingModalOpen, setIsStreamingModalOpen] = useState(false);

  const [openSections, setOpenSections] = useState<Record<FooterSectionKey, boolean>>({
    club: false,
    sede: false,
    enlaces: false,
    apoya: false,
  });

  const toggleSection = (key: FooterSectionKey) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <footer className="w-full bg-surface-container-lowest border-t border-white/5 pt-8 pb-8 text-on-surface">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        {/* Cabecera del Footer + RRSS siempre visibles (al inicio en mobile) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 overflow-hidden rounded-none border border-white/10 shrink-0">
              <Image
                src="/images/logo.jpg"
                alt="C.D. Voleibol San Pedro"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <span className="font-headline-sm text-lg uppercase tracking-wider text-on-surface block font-bold leading-tight">
                {CLUB_INFO.name}
              </span>
              <span className="font-label-sm text-[10px] uppercase tracking-widest text-primary font-bold">
                {CLUB_INFO.city} • {CLUB_INFO.socialHashtag}
              </span>
            </div>
          </div>

          {/* Redes Sociales Oficiales (Siempre visibles sin desplegar) */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <span className="text-[11px] text-tertiary font-semibold uppercase tracking-wider">
              Redes Oficiales:
            </span>
            <div className="grid grid-cols-3 sm:flex items-center gap-2">
              <a
                href={CLUB_INFO.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram Oficial del C.D. Voleibol San Pedro"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] hover:opacity-90 text-white text-[11px] uppercase tracking-wider font-bold transition-all shadow-[3px_3px_0px_0px_#0e0e0e]"
              >
                <InstagramIcon className="w-4 h-4 text-white shrink-0" />
                <span>Instagram</span>
              </a>
              <a
                href={CLUB_INFO.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook Oficial del C.D. Voleibol San Pedro"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#1460c7] hover:bg-[#1150a8] text-white text-[11px] uppercase tracking-wider font-bold transition-all shadow-[3px_3px_0px_0px_#0e0e0e]"
              >
                <FacebookIcon className="w-4 h-4 text-white shrink-0" />
                <span>Facebook</span>
              </a>
              <a
                href={CLUB_INFO.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp Oficial del C.D. Voleibol San Pedro"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#25D366] hover:bg-[#20ba59] text-black text-[11px] uppercase tracking-wider font-bold transition-all shadow-[3px_3px_0px_0px_#0e0e0e]"
              >
                <WhatsAppIcon className="w-4 h-4 shrink-0" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        </div>

        {/* Secciones Desplegables con la información del Club */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 items-start gap-2.5 sm:gap-4 py-5">
          {/* Sección 1: Datos Oficiales del Club */}
          <div className="bg-surface-container-low/70 border border-white/10">
            <button
              type="button"
              onClick={() => toggleSection('club')}
              aria-expanded={openSections.club}
              aria-controls="footer-sec-club"
              className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-surface-container-high/60 transition-colors"
            >
              <span className="font-headline-sm text-sm uppercase tracking-wider text-primary font-bold">
                Datos del Club
              </span>
              <span
                className={`material-symbols-outlined text-[20px] text-tertiary transition-transform duration-200 ${
                  openSections.club ? 'rotate-180 text-primary' : ''
                }`}
                aria-hidden="true"
              >
                expand_more
              </span>
            </button>
            {openSections.club && (
              <div
                id="footer-sec-club"
                className="px-4 pb-4 pt-2 border-t border-white/5 text-[11px] text-tertiary space-y-1.5 font-body-sm"
              >
                <p>
                  <span className="text-on-surface font-semibold">Club Federado:</span>{' '}
                  {CLUB_INFO.federationRegisteredName}
                </p>
                <p>
                  <span className="text-on-surface font-semibold">Adscripción:</span> Deporte Base • Federación Andaluza de Voleibol (FAVB)
                </p>
                <p>
                  <span className="text-on-surface font-semibold">CIF:</span> {CLUB_INFO.cif}
                </p>
                <p>
                  <span className="text-on-surface font-semibold">Presidente:</span> {CLUB_INFO.president}
                </p>
                <div className="pt-2 mt-2 border-t border-white/5 flex items-center justify-between">
                  <span className="text-on-surface font-semibold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-red-500" aria-hidden="true">sensors</span>
                    <span>Retransmisión:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsStreamingModalOpen(true)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                      streamingStatus.active
                        ? 'bg-red-600/90 hover:bg-red-700 text-white border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                        : 'bg-white/5 text-tertiary border-white/10 hover:text-white hover:bg-white/10 hover:border-white/20'
                    }`}
                    title={streamingStatus.active ? 'Retransmisión activa (Clic para finalizar)' : 'Configurar streaming de YouTube'}
                  >
                    {streamingStatus.active ? (
                      <>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        <span>Streaming</span>
                      </>
                    ) : (
                      <span>Streaming</span>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sección 2: Sede y Entrenamientos */}
          <div className="bg-surface-container-low/70 border border-white/10">
            <button
              type="button"
              onClick={() => toggleSection('sede')}
              aria-expanded={openSections.sede}
              aria-controls="footer-sec-sede"
              className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-surface-container-high/60 transition-colors"
            >
              <span className="font-headline-sm text-sm uppercase tracking-wider text-primary font-bold">
                Sede y Entrenamientos
              </span>
              <span
                className={`material-symbols-outlined text-[20px] text-tertiary transition-transform duration-200 ${
                  openSections.sede ? 'rotate-180 text-primary' : ''
                }`}
                aria-hidden="true"
              >
                expand_more
              </span>
            </button>
            {openSections.sede && (
              <div
                id="footer-sec-sede"
                className="px-4 pb-4 pt-2 border-t border-white/5 text-xs text-tertiary space-y-1.5 font-body-sm"
              >
                <p className="text-on-surface-variant font-medium">{CLUB_INFO.venueName}</p>
                <p>{CLUB_INFO.venueAddress}</p>
                <a
                  href={CLUB_INFO.venueMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:text-white transition-colors uppercase font-bold tracking-wider pt-0.5 font-label-sm"
                >
                  <span className="material-symbols-outlined text-[15px]" aria-hidden="true">pin_drop</span>
                  <span>Abrir en Google Maps</span>
                </a>
                <div className="pt-2 border-t border-white/5 space-y-1">
                  <p className="font-semibold text-on-surface">Domicilio Social:</p>
                  <p>{CLUB_INFO.officialAddress}</p>
                  <p className="font-semibold text-on-surface pt-1">Contacto Presidencia:</p>
                  <a
                    href={`tel:${CLUB_INFO.contactPhone.replace(/\s+/g, '')}`}
                    className="text-on-surface hover:text-primary transition-colors flex items-center min-h-[24px] font-mono"
                  >
                    {CLUB_INFO.contactPhone}
                  </a>
                  <a
                    href={`mailto:${CLUB_INFO.contactEmail}`}
                    className="text-primary hover:underline flex items-center min-h-[24px] break-all"
                  >
                    {CLUB_INFO.contactEmail}
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Sección 3: Enlaces y FAVB */}
          <div className="bg-surface-container-low/70 border border-white/10">
            <button
              type="button"
              onClick={() => toggleSection('enlaces')}
              aria-expanded={openSections.enlaces}
              aria-controls="footer-sec-enlaces"
              className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-surface-container-high/60 transition-colors"
            >
              <span className="font-headline-sm text-sm uppercase tracking-wider text-primary font-bold">
                Enlaces y FAVB
              </span>
              <span
                className={`material-symbols-outlined text-[20px] text-tertiary transition-transform duration-200 ${
                  openSections.enlaces ? 'rotate-180 text-primary' : ''
                }`}
                aria-hidden="true"
              >
                expand_more
              </span>
            </button>
            {openSections.enlaces && (
              <div id="footer-sec-enlaces" className="px-4 pb-4 pt-2 border-t border-white/5">
                <ul className="flex flex-col gap-2 font-body-sm text-xs text-tertiary">
                  <li>
                    <Link href="/plantillas" className="hover:text-primary transition-colors">
                      Plantillas y Cantera
                    </Link>
                  </li>
                  <li>
                    <Link href="/calendario" className="hover:text-primary transition-colors">
                      Calendario de Partidos
                    </Link>
                  </li>
                  <li>
                    <Link href="/clasificacion" className="hover:text-primary transition-colors">
                      Clasificación Oficial FAVB
                    </Link>
                  </li>
                  <li>
                    <Link href="/noticias" className="hover:text-primary transition-colors">
                      Crónicas y Sala de Prensa
                    </Link>
                  </li>
                  <li>
                    <Link href="/fan-zone" className="hover:text-primary transition-colors">
                      Fan-Zone y Votación MVP
                    </Link>
                  </li>
                  <li>
                    <a
                      href={CLUB_INFO.federationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline font-bold"
                    >
                      <span>Portal FAVB (favoley.net)</span>
                      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">open_in_new</span>
                    </a>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Sección 4: Apoya al Deporte Base */}
          <div className="bg-surface-container-low/70 border border-white/10">
            <button
              type="button"
              onClick={() => toggleSection('apoya')}
              aria-expanded={openSections.apoya}
              aria-controls="footer-sec-apoya"
              className="w-full px-4 py-3 flex items-center justify-between gap-2 text-left hover:bg-surface-container-high/60 transition-colors"
            >
              <span className="font-headline-sm text-sm uppercase tracking-wider text-primary font-bold">
                Apoya al Deporte Base
              </span>
              <span
                className={`material-symbols-outlined text-[20px] text-tertiary transition-transform duration-200 ${
                  openSections.apoya ? 'rotate-180 text-primary' : ''
                }`}
                aria-hidden="true"
              >
                expand_more
              </span>
            </button>
            {openSections.apoya && (
              <div id="footer-sec-apoya" className="px-4 pb-4 pt-2 border-t border-white/5 space-y-3">
                <p className="font-body-sm text-xs text-tertiary leading-relaxed">
                  ¿Tienes un negocio en San Pedro Alcántara o la Costa del Sol? Colabora con la cantera.
                </p>
                <div className="flex flex-col gap-2">
                  <Link
                    href="/patrocinio"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-container hover:bg-secondary-container text-white text-xs uppercase tracking-wider font-bold transition-all shadow-[4px_4px_0px_0px_#0e0e0e]"
                  >
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">handshake</span>
                    <span>Dossier de Patrocinio</span>
                  </Link>
                  <a
                    href={CLUB_INFO.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#25D366] hover:bg-[#20ba59] text-black text-xs uppercase tracking-wider font-bold transition-all shadow-[4px_4px_0px_0px_#0e0e0e]"
                  >
                    <WhatsAppIcon className="w-4 h-4" />
                    <span>WhatsApp Directo</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Banda Armónica de Empresas Colaboradoras (+15% en mobile, +25% en desktop y efecto zoom hover) */}
        <div className="py-5 border-t border-white/5">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3.5">
            <div className="flex items-center gap-2.5 shrink-0">
              <span className="w-1.5 h-1.5 bg-primary-container" aria-hidden="true" />
              <span className="font-label-sm text-[11px] uppercase tracking-widest text-tertiary font-bold">
                Empresas que ya forman parte del equipo
              </span>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 sm:gap-3">
              {CURRENT_SPONSORS.map((sponsor) => (
                <a
                  key={sponsor.id}
                  href={sponsor.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={sponsor.name}
                  aria-label={`Visitar web o perfil de ${sponsor.name}`}
                  className={`group relative h-[56px] sm:h-[70px] sm:min-w-[120px] px-3 sm:px-3.5 py-1.5 sm:py-2 flex items-center justify-center rounded-sm border border-white/15 hover:border-primary-container transition-all duration-300 ease-out hover:scale-105 hover:z-10 hover:shadow-[0_8px_22px_rgba(217,4,41,0.28)] shadow-sm overflow-hidden ${
                    sponsor.bgClass || 'bg-white'
                  }`}
                >
                  <Image
                    src={sponsor.logoUrl}
                    alt={sponsor.name}
                    width={160}
                    height={60}
                    className="h-[42px] sm:h-[50px] w-auto max-w-[125px] sm:max-w-[138px] object-contain opacity-95 group-hover:opacity-100 transition-transform duration-300 ease-out group-hover:scale-[1.15]"
                  />
                </a>
              ))}
              <Link
                href="/patrocinio"
                className="h-[56px] sm:h-[70px] px-3.5 flex items-center justify-center gap-1 border border-dashed border-white/15 hover:border-primary text-[11px] font-bold uppercase tracking-wider text-tertiary hover:text-primary transition-colors rounded-sm"
              >
                <span>¿Hacemos equipo?</span>
                <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Enlaces Legales y Copyright */}
        <div className="pt-5 border-t border-white/5 space-y-3 text-xs text-tertiary">
          <div className="flex flex-wrap items-center justify-between gap-y-2.5 gap-x-6">
            {/* Enlaces Legales Oficiales */}
            <nav aria-label="Enlaces legales" className="flex flex-wrap items-center gap-x-3.5 gap-y-1.5">
              <Link href="/aviso-legal" className="hover:text-primary transition-colors">
                Aviso Legal
              </Link>
              <span className="text-white/20 select-none">•</span>
              <Link href="/privacidad" className="hover:text-primary transition-colors">
                Política de Privacidad
              </Link>
              <span className="text-white/20 select-none">•</span>
              <Link href="/cookies" className="hover:text-primary transition-colors">
                Política de Cookies
              </Link>
              <span className="text-white/20 select-none">•</span>
              <Link href="/accesibilidad" className="text-on-surface-variant hover:text-white text-xs transition-colors">
                Accesibilidad
              </Link>
              <span className="text-white/20 select-none">•</span>
              <CookieSettingsButton />
            </nav>

            {/* Lema y Créditos de Desarrollo */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-start sm:justify-end sm:ml-auto">
              <span className="italic hidden md:inline">«{CLUB_INFO.motto}»</span>
              <span className="text-white/20 select-none hidden md:inline">•</span>
              <a
                href="mailto:caxon2@gmail.com"
                className="hover:text-primary transition-colors flex items-center gap-1 font-medium text-xs text-tertiary hover:text-white"
                title="Contacto de desarrollo web"
              >
                <span className="material-symbols-outlined text-[14px] text-primary" aria-hidden="true">code</span>
                <span>Web por <strong className="text-white/90 font-semibold">caxon2@gmail.com</strong></span>
              </a>
            </div>
          </div>

          <div className="pt-2.5 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-1.5 text-[11px] text-tertiary/70">
            <p>© {new Date().getFullYear()} {CLUB_INFO.federationRegisteredName} (CIF: {CLUB_INFO.cif}). Todos los derechos reservados.</p>
            <p className="text-center sm:text-right">Portal Oficial del C.D. Voleibol San Pedro | San Pedro Alcántara (Málaga)</p>
          </div>
        </div>
      </div>

      <StreamingModal
        isOpen={isStreamingModalOpen}
        onClose={() => setIsStreamingModalOpen(false)}
        isLive={streamingStatus.active}
        currentUrl={streamingStatus.url}
        onSuccess={(newStatus) => updateLocalStatus(newStatus)}
      />
    </footer>
  );
}
