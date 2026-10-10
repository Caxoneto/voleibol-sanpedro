import Link from 'next/link';
import Image from 'next/image';
import { CLUB_INFO } from '@/lib/data-store';
import CookieSettingsButton from '@/components/CookieSettingsButton';
import { InstagramIcon, FacebookIcon, WhatsAppIcon } from '@/components/SocialIcons';

export default function Footer() {
  return (
    <footer className="w-full bg-surface-container-lowest border-t border-white/5 pt-16 pb-10 text-on-surface">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Col 1: Club Info */}
          <div className="flex flex-col gap-4">
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
                <span className="font-headline-sm text-lg uppercase tracking-wider text-on-surface block font-bold">
                  {CLUB_INFO.name}
                </span>
                <span className="font-label-sm text-[10px] uppercase tracking-widest text-primary font-bold">
                  {CLUB_INFO.city}
                </span>
              </div>
            </div>
            <p className="font-body-sm text-xs text-tertiary leading-relaxed">
              Club deportivo formativo volcado en el deporte base, los jóvenes y las familias de San Pedro Alcántara.
            </p>
            <div className="text-[11px] text-tertiary space-y-1 pt-2 border-t border-white/5 font-body-sm">
              <p><span className="text-on-surface font-semibold">Club Federado:</span> {CLUB_INFO.federationRegisteredName}</p>
              <p><span className="text-on-surface font-semibold">Adscripción:</span> Deporte Base • Federación Andaluza de Voleibol (FAVB)</p>
              <p><span className="text-on-surface font-semibold">CIF:</span> {CLUB_INFO.cif}</p>
              <p><span className="text-on-surface font-semibold">Presidente:</span> {CLUB_INFO.president}</p>
            </div>
          </div>

          {/* Col 2: Sede y Ubicación */}
          <div className="flex flex-col gap-3">
            <h3 className="font-headline-sm text-base uppercase tracking-wider text-primary font-bold">
              Sede y Entrenamientos
            </h3>
            <p className="font-body-sm text-sm text-on-surface-variant font-medium">
              {CLUB_INFO.venueName}
            </p>
            <p className="font-body-sm text-xs text-tertiary">
              {CLUB_INFO.venueAddress}
            </p>
            <a
              href={CLUB_INFO.venueMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-white transition-colors uppercase font-bold tracking-wider mt-1 font-label-sm"
            >
              <span className="material-symbols-outlined text-[16px]">pin_drop</span>
              Abrir en Google Maps
            </a>
            <div className="text-xs text-tertiary mt-2 space-y-1 font-body-sm">
              <p className="font-semibold text-on-surface">Domicilio Social:</p>
              <p>{CLUB_INFO.officialAddress}</p>
              <p className="font-semibold text-on-surface pt-1">Email Oficial:</p>
              <a href={`mailto:${CLUB_INFO.contactEmail}`} className="text-primary hover:underline block">
                {CLUB_INFO.contactEmail}
              </a>
            </div>
          </div>

          {/* Col 3: Enlaces Rápidos y FAVB */}
          <div className="flex flex-col gap-3">
            <h3 className="font-display-xl text-lg uppercase tracking-wider text-primary">
              Enlaces y FAVB
            </h3>
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
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Contacto y Comercio Local */}
          <div className="flex flex-col gap-3">
            <h3 className="font-display-xl text-lg uppercase tracking-wider text-primary">
              Apoya al Deporte Base
            </h3>
            <p className="font-body-sm text-xs text-tertiary leading-relaxed">
              ¿Tienes un negocio en San Pedro Alcántara o la Costa del Sol? Colabora con la cantera.
            </p>
            <div className="flex flex-col gap-2 pt-1">
              <Link
                href="/patrocinio"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-container hover:bg-secondary-container text-white text-xs uppercase tracking-wider font-bold transition-all shadow-[4px_4px_0px_0px_#0e0e0e]"
              >
                <span className="material-symbols-outlined text-[16px]">handshake</span>
                Dossier de Patrocinio
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

            {/* Redes Sociales Oficiales */}
            <div className="pt-2 border-t border-white/5 space-y-2">
              <span className="text-[11px] text-tertiary block font-semibold uppercase tracking-wider">
                Redes Oficiales del Club:
              </span>
              <div className="grid grid-cols-2 gap-2">
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
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#1877F2] hover:bg-[#166fe5] text-white text-[11px] uppercase tracking-wider font-bold transition-all shadow-[3px_3px_0px_0px_#0e0e0e]"
                >
                  <FacebookIcon className="w-4 h-4 text-white shrink-0" />
                  <span>Facebook</span>
                </a>
              </div>
              <p className="text-[11px] text-tertiary pt-0.5">
                Etiquétanos: <span className="text-primary font-bold">{CLUB_INFO.socialHashtag}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Enlaces Legales y Copyright */}
        <div className="pt-8 border-t border-white/5 space-y-4 text-xs text-tertiary">
          <div className="flex flex-wrap items-center justify-between gap-y-3 gap-x-6">
            {/* Enlaces Legales Oficiales */}
            <nav aria-label="Enlaces legales" className="flex flex-wrap items-center gap-x-4 gap-y-2">
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
              <CookieSettingsButton />
            </nav>

            {/* Lema, Redes y Colaborador */}
            <div className="flex items-center gap-4">
              <span className="italic hidden md:inline">«{CLUB_INFO.motto}»</span>
              <span className="text-white/20 select-none hidden md:inline">•</span>
              <div className="flex items-center gap-3">
                <a
                  href={CLUB_INFO.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram del Club"
                  title="Instagram @voleibolsanpedro"
                  className="text-tertiary hover:text-[#E1306C] transition-colors flex items-center gap-1"
                >
                  <InstagramIcon className="w-4 h-4" />
                </a>
                <a
                  href={CLUB_INFO.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook del Club"
                  title="Facebook C.D. Voleibol San Pedro"
                  className="text-tertiary hover:text-[#1877F2] transition-colors flex items-center gap-1"
                >
                  <FacebookIcon className="w-4 h-4" />
                </a>
              </div>
              <span className="text-white/20 select-none">•</span>
              <a
                href="https://feelsports.es/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors flex items-center gap-1 font-semibold"
              >
                <span>FeelSports</span>
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>
            </div>
          </div>

          <div className="pt-3 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-tertiary/70">
            <p>© {new Date().getFullYear()} {CLUB_INFO.federationRegisteredName} (CIF: {CLUB_INFO.cif}). Todos los derechos reservados.</p>
            <p className="text-center sm:text-right">Portal Oficial del C.D. Voleibol San Pedro | San Pedro Alcántara (Málaga)</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
