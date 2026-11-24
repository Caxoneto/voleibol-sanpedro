import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const title = 'Clasificación Oficial FAVB y AFADE | C.D. Voleibol San Pedro';
const description =
  'Tablas de clasificación oficiales actualizadas por categoría y grupo del C.D. Voleibol San Pedro con sistema de puntuación y coeficientes RFEVB.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/clasificacion',
  },
  openGraph: {
    title,
    description,
    url: '/clasificacion',
  },
};

export default function ClasificacionLayout({ children }: { children: ReactNode }) {
  return children;
}
