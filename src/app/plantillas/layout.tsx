import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const title = 'Plantillas y Cuerpo Técnico | C.D. Voleibol San Pedro';
const description =
  'Jugadores, jugadoras y cuerpo técnico oficial por categorías (Senior, Juvenil, Cadete, Infantil, Alevín y Benjamín) del C.D. Voleibol San Pedro.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/plantillas',
  },
  openGraph: {
    title,
    description,
    url: '/plantillas',
  },
};

export default function PlantillasLayout({ children }: { children: ReactNode }) {
  return children;
}
