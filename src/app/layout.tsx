import type { Metadata } from 'next';
import { Anton, Space_Grotesk } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import TopMarquee from '@/components/TopMarquee';
import CookieConsent from '@/components/CookieConsent';

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

export const metadata: Metadata = {
  title: 'C.D. Voleibol San Pedro | Web Oficial',
  description:
    'Portal oficial del C.D. Voleibol San Pedro (San Pedro Alcántara, Málaga). Pabellón Polideportivo Sergio Scariolo. Deporte base, plantillas, calendarios y resultados oficiales FAVB.',
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`dark scroll-smooth ${anton.variable} ${spaceGrotesk.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&display=swap"
        />
      </head>
      <body className="bg-background font-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-primary-container selection:text-white">
        {/* Cabecera Fija Unificada (Nunca se pierde el banner ni se transparenta al scrolear) */}
        <header className="fixed top-0 left-0 w-full z-50 bg-[#131313] shadow-[0_4px_24px_rgba(0,0,0,0.8)]">
          <TopMarquee />
          <Navbar />
        </header>

        {/* Contenido principal comenzando justo debajo de la cabecera fija */}
        <main className="flex-1 w-full pt-28">
          {children}
        </main>
        
        <Footer />
        <CookieConsent />
      </body>
    </html>
  );
}
