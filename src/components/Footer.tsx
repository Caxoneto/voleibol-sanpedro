import Link from 'next/link';
import Image from 'next/image';
import { CLUB_INFO } from '@/lib/data-store';

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
                <span className="font-display-xl text-xl uppercase tracking-wider text-on-surface block">
                  C.D.V. SAN PEDRO
                </span>
                <span className="font-label-sm text-[10px] uppercase tracking-widest text-primary font-bold">
                  San Pedro Alcántara
                </span>
              </div>
            </div>
            <p className="font-body-sm text-xs text-tertiary leading-relaxed">
              Club deportivo formativo volcado en el deporte base, los jóvenes y las familias de San Pedro Alcántara.
            </p>
          </div>

          {/* Col 2: Sede y Ubicación */}
          <div className="flex flex-col gap-3">
            <h3 className="font-display-xl text-lg uppercase tracking-wider text-primary">
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
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-white transition-colors uppercase font-bold tracking-wider mt-1"
            >
              <span className="material-symbols-outlined text-[16px]">pin_drop</span>
              Abrir en Google Maps
            </a>
            <div className="text-xs text-tertiary mt-2">
              <p className="font-semibold text-on-surface">Horario de Cantera:</p>
              <p>Lunes a Jueves: 16:30h - 20:30h</p>
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
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#25D366] hover:bg-[#20ba59] text-black text-xs uppercase tracking-wider font-bold transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">chat</span>
                WhatsApp Directo
              </a>
            </div>
            <p className="text-[11px] text-tertiary pt-2">
              Etiquétanos: <span className="text-primary font-bold">{CLUB_INFO.socialHashtag}</span>
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-tertiary">
          <p>© {new Date().getFullYear()} C.D. Voleibol San Pedro. Todos los derechos reservados.</p>
          <div className="flex items-center gap-6">
            <span>«Pasión, cantera y orgullo sampedreño»</span>
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
      </div>
    </footer>
  );
}
