import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Mi Club | Área de Deportistas y Familias | C.D. Voleibol San Pedro',
  robots: {
    index: false,
    follow: false,
  },
};

export default function MiClubLayout({ children }: { children: ReactNode }) {
  return children;
}
