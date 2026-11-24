import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const title = 'Calendario de Competición | C.D. Voleibol San Pedro';
const description =
  'Calendario completo por jornadas y categorías FAVB y Liga AFADE, exportación PDF e iCalendar (.ics) y ubicación del Pabellón Sergio Scariolo.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/calendario',
  },
  openGraph: {
    title,
    description,
    url: '/calendario',
  },
};

export default function CalendarioLayout({ children }: { children: ReactNode }) {
  return children;
}
