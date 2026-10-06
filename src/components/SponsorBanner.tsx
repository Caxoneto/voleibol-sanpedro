import Link from 'next/link';

interface SponsorBannerProps {
  customText?: string;
}

export default function SponsorBanner({ customText }: SponsorBannerProps) {
  return (
    <div className="shimmer-effect relative overflow-hidden w-full bg-gradient-to-r from-surface-container-high via-surface-container-low to-surface-container-high border-y border-primary-container/20 py-4 px-4 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-4">
          <div className="px-2.5 py-1 bg-primary-container text-white font-label-sm text-[11px] uppercase font-bold tracking-widest flex items-center gap-1.5 shadow-sm shrink-0">
            <span className="material-symbols-outlined text-[16px] animate-pulse">campaign</span>
            <span>Espacio Patrocinio</span>
          </div>
          <div>
            <p className="font-headline-sm text-sm sm:text-base text-on-surface uppercase tracking-wide leading-tight">
              {customText || '¡ANÚNCIATE AQUÍ! APOYA A NUESTROS DEPORTISTAS'}
            </p>
            <p className="font-body-sm text-xs text-tertiary">
              Impulsa tu comercio con el C.D. Voleibol San Pedro. Visibilidad en el Pabellón Sergio Scariolo desde 250€/temporada.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/patrocinio"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-container hover:bg-secondary-container text-white font-label-md text-xs uppercase tracking-wider font-bold transition-all shadow-[4px_4px_0px_0px_#131313] hover:-translate-y-0.5"
          >
            <span className="material-symbols-outlined text-[16px]">handshake</span>
            <span>Ver Paquetes</span>
          </Link>
          <a
            href="https://wa.me/34622112233?text=Hola%2C%20quiero%20informaci%C3%B3n%20sobre%20patrocinar%20al%20CD%20Voleibol%20San%20Pedro"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-surface-container-highest hover:bg-surface-bright text-on-surface font-label-md text-xs uppercase tracking-wider transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">chat</span>
            <span>WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
}
