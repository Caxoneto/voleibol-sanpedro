import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const title = 'Partidos y Resultados Oficiales | C.D. Voleibol San Pedro';
const description =
  'Marcadores en directo, próximos enfrentamientos, actas oficiales FAVB y Liga AFADE y retransmisiones del C.D. Voleibol San Pedro.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/partidos',
  },
  openGraph: {
    title,
    description,
    url: '/partidos',
  },
};

export default function PartidosLayout({ children }: { children: ReactNode }) {
  return children;
}
