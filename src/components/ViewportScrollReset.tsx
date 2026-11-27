'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Reposiciona la ventana en la parte superior y restablece el enfoque al cambiar de pantalla,
 * evitando quedarse a mitad de página o con teclado/zoom móvil activo entre rutas.
 */
export default function ViewportScrollReset() {
  const pathname = usePathname();
  const isFirstMountRef = useRef(true);

  useEffect(() => {
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    const resetTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    resetTop();
    const rafId = window.requestAnimationFrame(() => {
      resetTop();
      window.dispatchEvent(new Event('resize'));
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [pathname]);

  return null;
}
