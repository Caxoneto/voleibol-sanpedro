import type { Metadata } from 'next';
import Link from 'next/link';
import {
  SlidersHorizontal,
  ShieldCheck,
  Database,
  Info,
  ExternalLink,
} from 'lucide-react';
import CookieSettingsButton from '@/components/CookieSettingsButton';
import { CLUB_INFO } from '@/lib/club-info';

export const metadata: Metadata = {
  title: 'Política de Cookies | C.D. Voleibol San Pedro',
  description:
    'Inventario real y transparente de cookies técnicas y almacenamiento local del navegador en el portal del C.D. Voleibol San Pedro conforme a la LSSI-CE y guía de la AEPD.',
};

export default function CookiesPage() {
  return (
    <div className="w-full min-h-screen bg-background relative overflow-hidden">
      {/* Subtle Page-Wide Ambient Background */}
      <div
        className="pointer-events-none fixed inset-0 w-full h-full bg-cover bg-center mix-blend-luminosity opacity-[0.14] blur-[3px] z-0"
        style={{ backgroundImage: "url('/images/pabellon-sergio-scariolo.jpg')" }}
      />

      {/* Cabecera */}
      <section className="relative w-full bg-surface-container-lowest px-4 lg:px-8 py-12 border-b border-white/5 overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 w-full h-full bg-cover bg-center mix-blend-luminosity opacity-40 blur-[2px] scale-105 animate-hero-bg transition-transform duration-1000"
          style={{ backgroundImage: "url('/images/pabellon-sergio-scariolo.jpg')" }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/85 to-transparent" />

        <div className="absolute -right-20 -top-24 w-96 h-96 rounded-full bg-primary-container/10 blur-3xl pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-primary-container text-white text-[11px] uppercase font-bold tracking-widest">
              GESTIÓN DE COOKIES Y PRIVACIDAD
            </span>
            <span className="text-xs text-tertiary uppercase tracking-wider">
              GUÍA AEPD &amp; ART. 22.2 LSSI-CE
            </span>
          </div>
          <h1 className="font-display-xl text-4xl sm:text-5xl lg:text-6xl uppercase text-white tracking-tight leading-none">
            POLÍTICA DE COOKIES
          </h1>
          <p className="font-body-md text-sm sm:text-base text-tertiary max-w-2xl mt-2">
            Inventario real y actualizado de las cookies y claves de almacenamiento local empleadas en el portal oficial de {CLUB_INFO.federationRegisteredName}.
          </p>
        </div>
      </section>

      {/* Contenido */}
      <section className="max-w-5xl mx-auto px-4 lg:px-8 py-12 relative z-10">
        <div className="space-y-10 text-on-surface font-body-sm text-sm sm:text-base leading-relaxed">
          {/* Panel Interactivo de Configuración */}
          <div className="bg-surface-container-low border border-primary-container/40 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary">
                <SlidersHorizontal className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Panel de Preferencias</span>
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white uppercase tracking-tight">
                ¿Deseas consultar el detalle técnico de almacenamiento?
              </h2>
              <p className="text-tertiary text-xs sm:text-sm">
                Este portal emplea únicamente cookies propias y almacenamiento local técnico exento de consentimiento previo (Art. 22.2 LSSI-CE). La constancia de lectura del aviso se conserva 12 meses.
              </p>
            </div>
            <div className="bg-primary-container hover:bg-secondary-container text-white text-xs uppercase font-bold tracking-wider px-5 py-3 transition-colors shadow-[4px_4px_0px_0px_#0e0e0e] shrink-0">
              <CookieSettingsButton />
            </div>
          </div>

          {/* 1. ¿Qué son las cookies y tecnologías similares? */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-3">
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              1. ¿Qué son las cookies y el almacenamiento local?
            </h2>
            <p className="text-tertiary">
              Las cookies son pequeños archivos de texto que un sitio web almacena en tu navegador, mientras que <strong className="text-white">HTML5 LocalStorage</strong> permite guardar datos técnicos temporales exclusivamente en tu dispositivo sin transmitirlos automáticamente en cada petición HTTP ni realizar seguimiento entre sitios distintos.
            </p>
            <p className="text-tertiary">
              En cumplimiento del artículo 22.2 de la Ley 34/2002 (LSSI-CE), el RGPD y la Guía sobre el uso de cookies de la AEPD, te informamos con total transparencia de las únicas tecnologías activas en este dominio.
            </p>
          </div>

          {/* 2. Categorías Reales */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-4">
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              2. Categorías empleadas en este portal
            </h2>
            <div className="space-y-4">
              <div className="bg-surface-container-low p-4 border border-white/5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                    <span>Cookies y Almacenamiento Técnico (Estrictamente Necesarios)</span>
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider bg-white/10 text-white px-2 py-0.5">
                    Siempre Activas · Exentas (Art. 22.2 LSSI-CE)
                  </span>
                </div>
                <p className="text-xs text-tertiary leading-relaxed">
                  Imprescindibles para la seguridad y funcionamiento básico del sitio: conservar tu propia decisión de privacidad durante 12 meses y gestionar la sesión autenticada de administración del club (<code className="text-primary font-mono">cdv_admin_session</code>, exclusivamente cuando un responsable accede al panel privado).
                </p>
              </div>

              <div className="bg-surface-container-low p-4 border border-white/5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <Database className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                    <span>Caché Técnica Local de Competición (LocalStorage)</span>
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider bg-white/10 text-white px-2 py-0.5">
                    Técnica / Funcional
                  </span>
                </div>
                <p className="text-xs text-tertiary leading-relaxed">
                  Claves locales en tu dispositivo para acelerar la visualización de calendarios, marcadores, clasificaciones, plantillas públicas autorizadas y estado de retransmisión en directo sin realizar perfilado ni analítica de usuarios.
                </p>
              </div>

              <div className="bg-surface-container-low p-4 border border-white/5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                    <span>Analítica de Terceros, Publicidad Comportamental y Rastreadores</span>
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-2 py-0.5">
                    No Utilizadas Actualmente
                  </span>
                </div>
                <p className="text-xs text-tertiary leading-relaxed">
                  Este portal <strong className="text-white">no carga actualmente cookies publicitarias, píxeles de redes sociales ni herramientas de analítica de terceros</strong>. Si en el futuro se incorporase medición opcional, permanecería bloqueada por defecto hasta obtener tu consentimiento expreso previo.
                </p>
              </div>
            </div>
          </div>

          {/* 3. Inventario Verificado */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-4">
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              3. Inventario real de cookies y claves de almacenamiento
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <caption className="sr-only">
                  Inventario real de cookies y almacenamiento local en el portal del C.D. Voleibol San Pedro
                </caption>
                <thead>
                  <tr className="border-b border-white/10 text-white uppercase font-bold tracking-wider bg-surface-container-low">
                    <th scope="col" className="p-3">Identificador</th>
                    <th scope="col" className="p-3">Mecanismo / Titular</th>
                    <th scope="col" className="p-3">Finalidad</th>
                    <th scope="col" className="p-3">Categoría</th>
                    <th scope="col" className="p-3">Duración</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-tertiary">
                  <tr className="hover:bg-white/[0.02]">
                    <td className="p-3 font-mono text-white">cdv_admin_session</td>
                    <td className="p-3">Cookie HTTP (Propia · HttpOnly, Secure, SameSite=Lax)</td>
                    <td className="p-3">Mantiene la sesión autenticada y revocable de secretaría/administración en <code className="font-mono">/admin</code>. No se instala a visitantes públicos.</td>
                    <td className="p-3"><span className="text-white font-semibold">Técnica (Necesaria)</span></td>
                    <td className="p-3">Máx. 24 horas o cierre de sesión</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="p-3 font-mono text-white">cdv_cookie_consent_v2</td>
                    <td className="p-3">LocalStorage (Propia)</td>
                    <td className="p-3">Guarda la versión y acuse informativo de este aviso técnico durante 12 meses en tu navegador (reemplaza claves previas <code className="font-mono">cdv_cookie_consent_v1</code> / <code className="font-mono">cdvsp_cookie_consent_v1</code>).</td>
                    <td className="p-3"><span className="text-white font-semibold">Técnica (Necesaria)</span></td>
                    <td className="p-3">12 meses</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="p-3 font-mono text-white">cdv_synced_matches_v7</td>
                    <td className="p-3">LocalStorage (Propia)</td>
                    <td className="p-3">Caché local de calendarios y partidos sincronizados (sin datos personales de convocatorias) para acelerar la carga en <code className="font-mono">/partidos</code> y <code className="font-mono">/calendario</code>.</td>
                    <td className="p-3"><span className="text-white font-semibold">Técnica / Caché</span></td>
                    <td className="p-3">Persistente local hasta refresco</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="p-3 font-mono text-white">cdv_synced_standings_v5</td>
                    <td className="p-3">LocalStorage (Propia)</td>
                    <td className="p-3">Caché local de tablas de clasificación oficial en <code className="font-mono">/clasificacion</code>.</td>
                    <td className="p-3"><span className="text-white font-semibold">Técnica / Caché</span></td>
                    <td className="p-3">Persistente local hasta refresco</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="p-3 font-mono text-white">cdv_streaming_state_v2 / cdv_streaming_recordings_v1</td>
                    <td className="p-3">LocalStorage (Propia)</td>
                    <td className="p-3">Sincronización local del estado de retransmisión en directo y enlace a partidos grabados publicados.</td>
                    <td className="p-3"><span className="text-white font-semibold">Técnica / Funcional</span></td>
                    <td className="p-3">Persistente local hasta refresco</td>
                  </tr>
                  <tr className="hover:bg-white/[0.02]">
                    <td className="p-3 font-mono text-white">cdv_mvp_voted_*</td>
                    <td className="p-3">LocalStorage (Propia, si participa en votación MVP)</td>
                    <td className="p-3">Indicador técnico auxiliar en el dispositivo para evitar duplicar votaciones en la Fan-Zone sin almacenar datos personales.</td>
                    <td className="p-3"><span className="text-white font-semibold">Técnica / Funcional</span></td>
                    <td className="p-3">Persistente local por jornada</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs text-tertiary pt-1">
              Nota: el almacenamiento local anterior permanece exclusivamente en tu navegador y puedes borrarlo en cualquier instante desde las herramientas de privacidad o limpieza de datos de tu navegador.
            </p>
          </div>

          {/* 4. Cómo gestionar cookies en el navegador */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-4">
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              4. ¿Cómo deshabilitar o eliminar cookies y almacenamiento en tu navegador?
            </h2>
            <p className="text-tertiary">
              Además de configurar tus preferencias en nuestro panel, puedes permitir, bloquear o eliminar las cookies y datos locales mediante las opciones de configuración de tu navegador:
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
                <ExternalLink className="w-4 h-4 text-tertiary group-hover:text-primary transition-colors shrink-0" aria-hidden="true" />
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
                <ExternalLink className="w-4 h-4 text-tertiary group-hover:text-primary transition-colors shrink-0" aria-hidden="true" />
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
                <ExternalLink className="w-4 h-4 text-tertiary group-hover:text-primary transition-colors shrink-0" aria-hidden="true" />
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
                <ExternalLink className="w-4 h-4 text-tertiary group-hover:text-primary transition-colors shrink-0" aria-hidden="true" />
              </a>
            </div>
            <p className="text-xs text-tertiary pt-2">
              Para cualquier consulta sobre esta Política de Cookies puedes dirigirte a{' '}
              <a href={`mailto:${CLUB_INFO.contactEmail}`} className="text-primary font-semibold hover:underline">
                {CLUB_INFO.contactEmail}
              </a>.
            </p>
          </div>

          {/* Enlaces de pie de página */}
          <div className="p-6 bg-surface-container-low border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-white font-semibold">Más información legal del club</p>
              <p className="text-xs text-tertiary">Revisa nuestros términos de servicio y tratamiento de datos personales.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
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
