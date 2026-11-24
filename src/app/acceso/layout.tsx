import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Acceso Privado | C.D. Voleibol San Pedro',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AccesoLayout({ children }: { children: ReactNode }) {
  return children;
}
