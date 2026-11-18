import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import ClubShell from '@/components/intranet/ClubShell';

export const metadata: Metadata = {
  title: 'Área de Staff | C.D. Voleibol San Pedro',
  description: 'Intranet privada de cuerpo técnico, coordinación y directiva del C.D. Voleibol San Pedro.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ClubLayout({ children }: { children: ReactNode }) {
  return <ClubShell>{children}</ClubShell>;
}
