import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Accessibility,
  TriangleAlert,
  Keyboard,
  ArrowRight,
  Contrast,
  Code,
  CirclePause,
  Table,
  Mail,
} from 'lucide-react';
import { CLUB_INFO } from '@/lib/club-info';

export const metadata: Metadata = {
  title: 'Declaración de Accesibilidad | C.D. Voleibol San Pedro',
  description:
    'Declaración de accesibilidad web del portal oficial del C.D. Voleibol San Pedro conforme a la Norma UNE-EN 301 549:2022, WCAG 2.1 nivel AA y Ley 11/2023.',
  alternates: {
    canonical: '/accesibilidad',
  },
};

export default function AccesibilidadPage() {
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
              ACCESIBILIDAD UNIVERSAL
            </span>
            <span className="text-xs text-tertiary uppercase tracking-wider">
              UNE-EN 301 549:2022 &amp; WCAG 2.1 AA
            </span>
          </div>
          <h1 className="font-display-xl text-4xl sm:text-5xl lg:text-6xl uppercase text-white tracking-tight leading-none">
            DECLARACIÓN <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-[#ff4d63] to-white">DE ACCESIBILIDAD</span>
          </h1>
          <p className="font-body-md text-sm sm:text-base text-tertiary max-w-2xl mt-2">
            Compromiso de {CLUB_INFO.federationRegisteredName} con la inclusión digital, trabajando de forma continua para facilitar el acceso a la información y trámites deportivos del club a todas las personas.
          </p>
        </div>
      </section>

      {/* Contenido */}
      <section className="max-w-5xl mx-auto px-4 lg:px-8 py-12 relative z-10">
        <div className="space-y-10 text-on-surface font-body-sm text-sm sm:text-base leading-relaxed">
          {/* 1. Compromiso y Marco Normativo */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-xs">
              <Accessibility className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Compromiso Institucional</span>
            </div>
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              1. Compromiso con la Accesibilidad y Estándares de Referencia
            </h2>
            <p className="text-tertiary">
              El <strong className="text-white">{CLUB_INFO.name}</strong>, como entidad deportiva asociativa privada sin ánimo de lucro, adopta voluntariamente y de acuerdo con la normativa aplicable a servicios digitales los estándares técnicos europeos e internacionales de accesibilidad web para eliminar barreras de acceso a deportistas, familias y aficionados.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-surface-container-low p-4 border border-white/5 space-y-1">
                <span className="text-xs uppercase font-bold text-primary block">Norma UNE-EN 301 549:2022</span>
                <span className="text-white font-semibold">Requisitos de accesibilidad TIC</span>
                <p className="text-xs text-tertiary">Estándar europeo armonizado de referencia para sitios web y componentes interactivos digitales.</p>
              </div>
              <div className="bg-surface-container-low p-4 border border-white/5 space-y-1">
                <span className="text-xs uppercase font-bold text-primary block">WCAG 2.1 — Nivel AA</span>
                <span className="text-white font-semibold">W3C / WAI</span>
                <p className="text-xs text-tertiary">Pautas de Accesibilidad para el Contenido Web en sus principios de perceptibilidad, operabilidad, comprensibilidad y robustez.</p>
              </div>
              <div className="bg-surface-container-low p-4 border border-white/5 space-y-1">
                <span className="text-xs uppercase font-bold text-primary block">Ley 11/2023, de 8 de mayo</span>
                <span className="text-white font-semibold">Transposición Directiva (UE) 2019/882</span>
                <p className="text-xs text-tertiary">Marco de accesibilidad de servicios y entornos interactivos en el ámbito europeo y estatal, adoptado como referencia de calidad del portal.</p>
              </div>
              <div className="bg-surface-container-low p-4 border border-white/5 space-y-1">
                <span className="text-xs uppercase font-bold text-primary block">R.D. Legislativo 1/2013</span>
                <span className="text-white font-semibold">Derechos de las personas con discapacidad</span>
                <p className="text-xs text-tertiary">Texto Refundido de la Ley General de derechos de las personas con discapacidad y de su inclusión social.</p>
              </div>
            </div>
          </div>

          {/* 2. Situación de Cumplimiento (Veraz y Honesta) */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-4">
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              2. Situación de Cumplimiento Actual
            </h2>
            <div className="p-4 bg-surface-container-low border-l-4 border-amber-400 space-y-2">
              <div className="flex items-center gap-2">
                <TriangleAlert className="w-5 h-5 text-amber-300 shrink-0" aria-hidden="true" />
                <span className="text-white font-bold uppercase tracking-wider text-sm">
                  Parcialmente Conforme con WCAG 2.1 Nivel AA (en mejora continua)
                </span>
              </div>
              <p className="text-xs text-tertiary leading-relaxed">
                Este sitio web es <strong className="text-white">parcialmente conforme</strong> con los criterios de nivel AA de las pautas <strong className="text-white">WCAG 2.1</strong> y la norma <strong className="text-white">UNE-EN 301 549:2022</strong>. El club mantiene un plan activo de revisión técnica de contrastes, etiquetado de formularios, modales y controles de movimiento.
              </p>
            </div>
            <div className="p-4 bg-surface-container-low border border-white/5 space-y-1.5 text-xs text-tertiary">
              <h3 className="text-white font-bold text-sm">Limitaciones conocidas y contenidos de terceros</h3>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>
                  <strong className="text-white">Documentos PDF descargables:</strong> los resguardos en PDF generados dinámicamente para autorizaciones o calendarios pueden presentar limitaciones parciales de etiquetado semántico para lectores de pantalla; como alternativa accesible, toda la información del trámite se muestra en HTML en el propio portal y se remite en formato texto/HTML por correo electrónico.
                </li>
                <li>
                  <strong className="text-white">Plataformas federativas externas:</strong> los enlaces salientes hacia portales externos como <code className="font-mono">favoley.net</code>, <code className="font-mono">ligaafade.es</code> o mapas externos dependen de terceros ajenos al control técnico del club.
                </li>
              </ul>
            </div>
          </div>

          {/* 3. Medidas Técnicas Implementadas */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-4">
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              3. Medidas Técnicas Aplicadas en la Interfaz
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface-container-low p-4 border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold">
                  <Keyboard className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                  <span>Navegación por Teclado y Modales</span>
                </div>
                <p className="text-xs text-tertiary leading-relaxed">
                  Uso de foco visible (<code className="text-primary font-mono">:focus-visible</code>), cierre mediante tecla <code className="text-primary font-mono">Escape</code> en diálogos modales y menús móviles y elementos interactivos semánticos (<code className="text-white font-mono">&lt;button&gt;</code>, <code className="text-white font-mono">&lt;a&gt;</code>).
                </p>
              </div>

              <div className="bg-surface-container-low p-4 border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold">
                  <ArrowRight className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                  <span>Enlace de Salto al Contenido</span>
                </div>
                <p className="text-xs text-tertiary leading-relaxed">
                  Primer enlace interactivo de salto directo al contenido principal (<code className="text-primary font-mono">#main-content</code>) para evitar recorrer repetidamente la cabecera de navegación.
                </p>
              </div>

              <div className="bg-surface-container-low p-4 border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold">
                  <Contrast className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                  <span>Revisión de Contrastes Cromáticos AA</span>
                </div>
                <p className="text-xs text-tertiary leading-relaxed">
                  Ajuste de tokens de color para reservar el rojo institucional de alto contraste (<code className="text-primary font-mono">bg-primary-container</code>) en botones con texto blanco y emplear tonos claros (<code className="text-primary font-mono">text-primary</code>) únicamente sobre superficies oscuras.
                </p>
              </div>

              <div className="bg-surface-container-low p-4 border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold">
                  <Code className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                  <span>Semántica HTML5 y Atributos ARIA</span>
                </div>
                <p className="text-xs text-tertiary leading-relaxed">
                  Regiones semánticas (<code className="text-white font-mono">&lt;header&gt;</code>, <code className="text-white font-mono">&lt;main&gt;</code>, <code className="text-white font-mono">&lt;footer&gt;</code>, <code className="text-white font-mono">&lt;nav&gt;</code>), diálogos con <code className="text-primary font-mono">role=&quot;dialog&quot;</code> e iconos vectoriales locales marcados con <code className="text-primary font-mono">aria-hidden=&quot;true&quot;</code>.
                </p>
              </div>

              <div className="bg-surface-container-low p-4 border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold">
                  <CirclePause className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                  <span>Control de Movimiento y Marquesinas</span>
                </div>
                <p className="text-xs text-tertiary leading-relaxed">
                  Control interactivo de pausa en marquesinas superiores y soporte de <code className="text-primary font-mono">prefers-reduced-motion: reduce</code> para detener animaciones continuas cuando el usuario lo prefiera.
                </p>
              </div>

              <div className="bg-surface-container-low p-4 border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold">
                  <Table className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                  <span>Tablas y Formularios Etiquetados</span>
                </div>
                <p className="text-xs text-tertiary leading-relaxed">
                  Tablas con <code className="text-white font-mono">&lt;caption&gt;</code> y encabezados <code className="text-primary font-mono">scope=&quot;col&quot;</code>, junto a asociación explícita de campos mediante <code className="text-primary font-mono">htmlFor</code> e <code className="text-primary font-mono">id</code>.
                </p>
              </div>
            </div>
          </div>

          {/* 4. Preparación de la Declaración */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-3">
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              4. Preparación y Revisión de la Presente Declaración
            </h2>
            <p className="text-tertiary">
              La presente declaración ha sido revisada y actualizada el <strong className="text-white">16 de noviembre de 2026</strong>.
            </p>
            <p className="text-tertiary">
              El método empleado ha consistido en una <strong className="text-white">autoevaluación técnica interna</strong> sobre el código fuente en Next.js / TypeScript, revisión de contraste cromático WCAG 2.1 AA, estructura semántica ARIA y pruebas de navegación por teclado y móvil.
            </p>
          </div>

          {/* 5. Contacto y Asistencia */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-4">
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              5. Comunicaciones, Sugerencias y Soporte Accesible
            </h2>
            <p className="text-tertiary">
              Si encuentras alguna barrera de accesibilidad en este portal, necesitas un documento en formato alternativo o deseas trasladarnos una sugerencia de mejora, puedes contactar directamente con el club:
            </p>
            <div className="bg-surface-container-low p-4 sm:p-6 border border-white/5 space-y-3 text-sm">
              <p className="flex flex-wrap items-center gap-2">
                <Mail className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                <strong className="text-white">Correo electrónico de soporte:</strong>
                <a href={`mailto:${CLUB_INFO.contactEmail}`} className="text-primary font-bold hover:underline">
                  {CLUB_INFO.contactEmail}
                </a>
              </p>
              <p>
                <strong className="text-white">Teléfono de secretaría:</strong> {CLUB_INFO.contactPhone}
              </p>
              <p>
                <strong className="text-white">Dirección postal:</strong> {CLUB_INFO.officialAddress}
              </p>
              <p className="text-xs text-tertiary pt-2 border-t border-white/5">
                Las solicitudes o incidencias de accesibilidad serán atendidas por la secretaría del club en un plazo máximo de quince (15) días hábiles. Si la respuesta no resultase satisfactoria, la persona interesada podrá trasladar su consulta ante los organismos competentes en materia de consumo o de derechos de las personas con discapacidad de la Comunidad Autónoma de Andalucía.
              </p>
            </div>
          </div>

          {/* Enlaces de pie de página */}
          <div className="p-6 bg-surface-container-low border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-white font-semibold">Transparencia y marco legal del club</p>
              <p className="text-xs text-tertiary">Consulta las condiciones de uso, aviso legal y políticas de privacidad.</p>
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
                className="px-4 py-2 bg-surface-container-highest hover:bg-surface-container text-white text-xs uppercase font-bold tracking-wider transition-colors border border-white/10"
              >
                Privacidad
              </Link>
              <Link
                href="/cookies"
                className="px-4 py-2 bg-primary-container hover:bg-secondary-container text-white text-xs uppercase font-bold tracking-wider transition-colors"
              >
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
