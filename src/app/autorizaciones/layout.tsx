import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Portal de Autorizaciones | C.D. Voleibol San Pedro',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AutorizacionesLayout({ children }: { children: ReactNode }) {
  return children;
}
