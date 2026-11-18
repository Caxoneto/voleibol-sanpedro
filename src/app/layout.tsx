import type { Metadata } from 'next';
import { Anton, Space_Grotesk, Caveat_Brush } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import TopMarquee from '@/components/TopMarquee';
import CookieConsent from '@/components/CookieConsent';
import { CLUB_INFO } from '@/lib/club-info';

const anton = Anton({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-anton',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const caveatBrush = Caveat_Brush({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-brush',
  display: 'swap',
});

function getMetadataBaseUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    try {
      const parsed = new URL(raw);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
        return parsed;
      }
    } catch {
      // Fallback seguro si NEXT_PUBLIC_SITE_URL no es válida
    }
  }
  return new URL('https://voleibolsanpedro.es');
}

export const metadata: Metadata = {
  metadataBase: getMetadataBaseUrl(),
  title: `${CLUB_INFO.name} | Web Oficial`,
  description: `Portal oficial del ${CLUB_INFO.name} (${CLUB_INFO.city}, ${CLUB_INFO.province}). ${CLUB_INFO.venueName}. Deporte base, plantillas, calendarios y resultados oficiales FAVB.`,
  keywords: [
    'Voleibol San Pedro',
    'CD Voleibol San Pedro',
    'San Pedro Alcántara',
    'Pabellón Sergio Scariolo',
    'Vóley Marbella',
    'FAVB',
    'Federación Andaluza de Voleibol',
  ],
  icons: {
    icon: '/images/logo.jpg',
  },
  openGraph: {
    title: `${CLUB_INFO.name} | Web Oficial`,
    description: `Portal oficial del ${CLUB_INFO.name} (${CLUB_INFO.city}, ${CLUB_INFO.province}). Deporte base, plantillas, calendarios y resultados oficiales FAVB.`,
    url: '/',
    siteName: CLUB_INFO.name,
    locale: 'es_ES',
    type: 'website',
    images: [
      {
        url: '/images/logo.jpg',
        alt: `${CLUB_INFO.name} - Escudo Oficial`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${CLUB_INFO.name} | Web Oficial`,
    description: `Portal oficial del ${CLUB_INFO.name}. Deporte base, plantillas, calendarios y resultados oficiales FAVB.`,
    images: ['/images/logo.jpg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`dark scroll-smooth ${anton.variable} ${spaceGrotesk.variable} ${caveatBrush.variable}`}
    >
      <body className="bg-background font-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-primary-container selection:text-white">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2.5 focus:bg-primary-container focus:text-white focus:font-headline focus:font-bold focus:text-xs focus:uppercase focus:tracking-widest focus:rounded-sm focus:shadow-lg"
        >
          Saltar al contenido principal
        </a>

        {/* Cabecera Fija Unificada */}
        <header className="fixed top-0 left-0 w-full z-50 bg-[#131313] shadow-[0_4px_24px_rgba(0,0,0,0.8)]">
          <TopMarquee />
          <Navbar />
        </header>

        {/* Contenido principal comenzando justo debajo de la cabecera fija */}
        <main id="main-content" tabIndex={-1} className="flex-1 w-full pt-28 focus:outline-none">
          {children}
        </main>

        <Footer />
        <CookieConsent />
      </body>
    </html>
  );
}
