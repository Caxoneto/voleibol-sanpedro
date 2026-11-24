import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const title = 'Fan-Zone Comunitaria | C.D. Voleibol San Pedro';
const description =
  'Votación oficial de MVP Senior, cánticos de la grada del Sergio Scariolo, galería comunitaria y fondos oficiales descargables del club.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/fan-zone',
  },
  openGraph: {
    title,
    description,
    url: '/fan-zone',
  },
};

export default function FanZoneLayout({ children }: { children: ReactNode }) {
  return children;
}
