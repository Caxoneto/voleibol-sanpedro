import type { Metadata } from 'next';
import Link from 'next/link';
import CookieSettingsButton from '@/components/CookieSettingsButton';
import { CLUB_INFO } from '@/lib/data-store';

export const metadata: Metadata = {
  title: 'Política de Cookies | C.D. Voleibol San Pedro',
  description:
    'Información sobre el uso de cookies, almacenamiento local y gestión del consentimiento en el portal del C.D. Voleibol San Pedro.',
};

export default function CookiesPage() {
  return (
    <div className="w-full min-h-screen bg-background">
      {/* Cabecera */}
      <section className="relative w-full bg-surface-container-lowest px-4 lg:px-8 py-12 border-b border-white/5 overflow-hidden">
        <div className="absolute -right-20 -top-24 w-96 h-96 rounded-full bg-primary-container/10 blur-3xl pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-primary-container text-white text-[11px] uppercase font-bold tracking-widest">
              GESTIÓN DE COOKIES Y PRIVACIDAD
            </span>
            <span className="text-xs text-tertiary uppercase tracking-wider">
              GUÍA AEPD & LSSI-CE
            </span>
          </div>
          <h1 className="font-display-xl text-4xl sm:text-5xl lg:text-6xl uppercase text-white tracking-tight leading-none">
            POLÍTICA DE COOKIES
          </h1>
          <p className="font-body-md text-sm sm:text-base text-tertiary max-w-2xl mt-2">
            Transparencia sobre qué tecnologías de almacenamiento empleamos en el sitio web de {CLUB_INFO.federationRegisteredName} y cómo configurar tus preferencias en cualquier momento.
          </p>
        </div>
      </section>

      {/* Contenido */}
      <section className="max-w-5xl mx-auto px-4 lg:px-8 py-12">
        <div className="space-y-10 text-on-surface font-body-sm text-sm sm:text-base leading-relaxed">
          {/* Panel Interactivo de Configuración */}
          <div className="bg-surface-container-low border border-primary-container/40 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary">
                <span className="material-symbols-outlined text-[16px]">tune</span>
                Panel de Preferencias
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white uppercase tracking-tight">
                ¿Deseas modificar tus preferencias de cookies?
              </h2>
              <p className="text-tertiary text-xs sm:text-sm">
                Puedes cambiar de opinión o revocar tu consentimiento en cualquier instante abriendo el gestor interactivo.
              </p>
            </div>
            <div className="bg-primary-container hover:bg-secondary-container text-white text-xs uppercase font-bold tracking-wider px-5 py-3 transition-colors shadow-[4px_4px_0px_0px_#0e0e0e] shrink-0">
              <CookieSettingsButton />
            </div>
          </div>

          {/* 1. ¿Qué son las cookies? */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-3">
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              1. ¿Qué son las cookies y tecnologías similares?
            </h2>
            <p className="text-tertiary">
              Una cookie es un pequeño archivo de texto que un sitio web guarda en tu ordenador, tableta o teléfono móvil cuando lo visitas. Permiten que la web recuerde tus acciones y preferencias (como inicio de sesión, idioma, tamaño de letra u otras opciones de visualización) durante un período de tiempo, para que no tengas que volver a configurarlas cada vez que regresas al sitio.
            </p>
            <p className="text-tertiary">
              Además de las cookies convencionales, este portal puede utilizar tecnologías de almacenamiento local del navegador (<strong className="text-white">HTML5 LocalStorage y SessionStorage</strong>) para recordar preferencias de navegación y garantizar la seguridad técnica sin almacenar datos sensibles ni realizar seguimiento individualizado entre sitios web.
            </p>
          </div>

          {/* 2. Tipos de cookies */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-4">
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              2. Tipos de cookies que utiliza este portal
            </h2>
            <div className="space-y-4">
              <div className="bg-surface-container-low p-4 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">verified_user</span>
                    Cookies Técnicas y Estrictamente Necesarias
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider bg-white/10 text-white px-2 py-0.5">
                    Siempre Activas
                  </span>
                </div>
                <p className="text-xs text-tertiary leading-relaxed">
                  Son esenciales para que la web funcione correctamente. Permiten la navegación a través del sitio, el uso de las diferentes opciones o servicios (enrutamiento seguro en Next.js, carga de recursos visuales) y la custodia de tu propia decisión de consentimiento de cookies. Al ser imprescindibles, no pueden ser desactivadas en nuestros sistemas.
                </p>
              </div>

              <div className="bg-surface-container-low p-4 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">analytics</span>
                    Cookies de Análisis y Rendimiento
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider bg-primary-container/20 text-primary border border-primary-container/30 px-2 py-0.5">
                    Opcionales
                  </span>
                </div>
                <p className="text-xs text-tertiary leading-relaxed">
                  Nos permiten cuantificar el número de usuarios y realizar la medición y análisis estadístico del uso que hacen del portal (páginas más visitadas, secciones de partidos o crónicas). La información se recoge de forma agregada y anónima con el único objetivo de optimizar la experiencia informativa de la afición.
                </p>
              </div>

              <div className="bg-surface-container-low p-4 border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">settings</span>
                    Cookies de Preferencias y Funcionalidad
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider bg-primary-container/20 text-primary border border-primary-container/30 px-2 py-0.5">
                    Opcionales
                  </span>
                </div>
                <p className="text-xs text-tertiary leading-relaxed">
                  Permiten recordar información para que accedas al portal con determinadas características personalizadas que pueden diferenciar tu experiencia de la de otros usuarios (como filtros de competiciones o categorías preferidas).
                </p>
              </div>
            </div>
          </div>

          {/* 3. Tabla detallada */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-4">
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              3. Inventario y Tabla de Cookies Utilizadas
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-white uppercase font-bold tracking-wider bg-surface-container-low">
                    <th className="p-3">Identificador</th>
                    <th className="p-3">Titular</th>
                    <th className="p-3">Finalidad</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Duración</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-tertiary">
                  <tr className="hover:bg-white/[0.02]">
                    <td className="p-3 font-mono text-white">cdvsp_cookie_consent_v1</td>
                    <td className="p-3">Propia</td>
                    <td className="p-3">Almacena el estado de consentimiento del usuario respecto a las políticas de cookies.</td>
                    <td className="p-3"><span className="text-white font-semibold">Técnica (Necesaria)</span></td>
                    <td className="p-3">12 meses</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="p-3 font-mono text-white">cdvsp_mvp_votes</td>
                    <td className="p-3">Propia</td>
                    <td className="p-3">Registra los votos emitidos en la Fan-Zone para evitar duplicidad de votaciones en un mismo dispositivo.</td>
                    <td className="p-3"><span className="text-white font-semibold">Técnica / Funcional</span></td>
                    <td className="p-3">Persistente local</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="p-3 font-mono text-white">__nf_analytics (si activo)</td>
                    <td className="p-3">Netlify (Proveedor Hosting)</td>
                    <td className="p-3">Métricas técnicas de carga y servidor anonimizadas sin trazado de datos personales.</td>
                    <td className="p-3">Analítica</td>
                    <td className="p-3">Sesión</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Cómo gestionar cookies en el navegador */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-4">
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              4. ¿Cómo deshabilitar o eliminar cookies en tu navegador?
            </h2>
            <p className="text-tertiary">
              Además de configurar tus preferencias en nuestro banner interactivo, puedes permitir, bloquear o eliminar las cookies instaladas en tu equipo mediante la configuración de las opciones de tu navegador web:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <a
                href="https://support.google.com/chrome/answer/95647?hl=es"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-surface-container-low p-4 border border-white/5 hover:border-primary/50 transition-colors flex items-center justify-between group"
              >
                <div>
                  <span className="text-white font-bold text-sm block">Google Chrome</span>
                  <span className="text-xs text-tertiary">Instrucciones de configuración</span>
                </div>
                <span className="material-symbols-outlined text-tertiary group-hover:text-primary transition-colors text-[18px]">open_in_new</span>
              </a>

              <a
                href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web-rastrear-preferencias"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-surface-container-low p-4 border border-white/5 hover:border-primary/50 transition-colors flex items-center justify-between group"
              >
                <div>
                  <span className="text-white font-bold text-sm block">Mozilla Firefox</span>
                  <span className="text-xs text-tertiary">Instrucciones de configuración</span>
                </div>
                <span className="material-symbols-outlined text-tertiary group-hover:text-primary transition-colors text-[18px]">open_in_new</span>
              </a>

              <a
                href="https://support.apple.com/es-es/guide/safari/sfri11471/mac"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-surface-container-low p-4 border border-white/5 hover:border-primary/50 transition-colors flex items-center justify-between group"
              >
                <div>
                  <span className="text-white font-bold text-sm block">Apple Safari</span>
                  <span className="text-xs text-tertiary">Instrucciones de configuración</span>
                </div>
                <span className="material-symbols-outlined text-tertiary group-hover:text-primary transition-colors text-[18px]">open_in_new</span>
              </a>

              <a
                href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-las-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-surface-container-low p-4 border border-white/5 hover:border-primary/50 transition-colors flex items-center justify-between group"
              >
                <div>
                  <span className="text-white font-bold text-sm block">Microsoft Edge</span>
                  <span className="text-xs text-tertiary">Instrucciones de configuración</span>
                </div>
                <span className="material-symbols-outlined text-tertiary group-hover:text-primary transition-colors text-[18px]">open_in_new</span>
              </a>
            </div>
            <p className="text-xs text-tertiary pt-2">
              Ten en cuenta que si bloqueas las cookies técnicas necesarias, algunas funciones del sitio web podrían dejar de operar correctamente.
            </p>
          </div>

          {/* Enlaces de pie de página */}
          <div className="p-6 bg-surface-container-low border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-white font-semibold">Más información legal del club</p>
              <p className="text-xs text-tertiary">Revisa nuestros términos de servicio y tratamiento de datos personales.</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/aviso-legal"
                className="px-4 py-2 bg-surface-container-highest hover:bg-surface-container text-white text-xs uppercase font-bold tracking-wider transition-colors border border-white/10"
              >
                Aviso Legal
              </Link>
              <Link
                href="/privacidad"
                className="px-4 py-2 bg-primary-container hover:bg-secondary-container text-white text-xs uppercase font-bold tracking-wider transition-colors"
              >
                Política de Privacidad
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
