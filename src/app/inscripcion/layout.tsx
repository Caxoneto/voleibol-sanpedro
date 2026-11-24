import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Inscripción Oficial | C.D. Voleibol San Pedro',
  robots: {
    index: false,
    follow: false,
  },
};

export default function InscripcionLayout({ children }: { children: ReactNode }) {
  return children;
}
