import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const title = 'Protección del Menor y Canal Confidencial LOPIVI | C.D. Voleibol San Pedro';
const description =
  'Canal confidencial cifrado, Delegado de Protección del Menor, Protocolo Interno frente a la Violencia y Código de Conducta conforme a la LOPIVI 8/2021.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/proteccion-menor',
  },
  openGraph: {
    title,
    description,
    url: '/proteccion-menor',
  },
};

export default function ProteccionMenorLayout({ children }: { children: ReactNode }) {
  return children;
}
