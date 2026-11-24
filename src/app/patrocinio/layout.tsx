import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const title = 'Patrocinio y Empresas Colaboradoras | C.D. Voleibol San Pedro';
const description =
  'Proyecto de Patrocinio 2026/2027 del C.D. Voleibol San Pedro: modalidades de colaboración, proyectos de empresa y alcance deportivo en San Pedro Alcántara.';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: '/patrocinio',
  },
  openGraph: {
    title,
    description,
    url: '/patrocinio',
  },
};

export default function PatrocinioLayout({ children }: { children: ReactNode }) {
  return children;
}
