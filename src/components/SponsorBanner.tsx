import Link from 'next/link';

interface SponsorBannerProps {
  customText?: string;
}

export default function SponsorBanner({ customText }: SponsorBannerProps) {
  return (
    <div className="shimmer-effect relative overflow-hidden w-full bg-gradient-to-r from-surface-container-high via-surface-container-low to-surface-container-high border-y border-primary-container/20 py-3 sm:py-4 px-4 lg:px-8">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4 relative z-10">
        <div className="flex items-center gap-3 sm:gap-4 text-center sm:text-left">
          <div className="px-2.5 py-1 bg-primary-container text-white font-label-sm text-[10px] sm:text-[11px] uppercase font-bold tracking-widest flex items-center gap-1.5 shadow-sm shrink-0">
            <span className="material-symbols-outlined text-[15px] sm:text-[16px] animate-pulse" aria-hidden="true">campaign</span>
            <span>Espacio Patrocinio</span>
          </div>
          <p className="font-headline-sm text-xs sm:text-base text-on-surface uppercase tracking-wide leading-tight font-bold">
            {customText || '¡ANÚNCIATE AQUÍ! APOYA A NUESTROS DEPORTISTAS'}
          </p>
        </div>

        <div className="flex items-center shrink-0">
          <Link
            href="/patrocinio"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-container hover:bg-secondary-container text-white font-label-md text-xs uppercase tracking-wider font-bold transition-all shadow-[4px_4px_0px_0px_#131313] hover:-translate-y-0.5"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">handshake</span>
            <span>Ver Modalidades</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
