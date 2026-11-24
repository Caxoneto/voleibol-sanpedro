import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const title = 'Noticias y Crónicas | C.D. Voleibol San Pedro';
const description =
  'Actualidad rojinegra, crónicas oficiales de jornada, comunicados institucionales y sala de prensa del C.D. Voleibol San Pedro en San Pedro Alcántara.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/noticias',
  },
  openGraph: {
    title,
    description,
    url: '/noticias',
  },
};

export default function NoticiasLayout({ children }: { children: ReactNode }) {
  return children;
}
