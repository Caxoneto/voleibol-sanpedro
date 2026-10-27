import type { Metadata } from 'next';
import Link from 'next/link';
import { CLUB_INFO } from '@/lib/data-store';

export const metadata: Metadata = {
  title: 'Declaración de Accesibilidad | C.D. Voleibol San Pedro',
  description:
    'Declaración de accesibilidad web del portal oficial del C.D. Voleibol San Pedro conforme a la Norma UNE-EN 301 549:2022, WCAG 2.1 nivel AA, Real Decreto 1112/2018 y Ley 11/2023.',
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
        {/* Background Image (Pabellón Sergio Scariolo) with slight blur */}
        <div
          className="pointer-events-none absolute inset-0 w-full h-full bg-cover bg-center mix-blend-luminosity opacity-40 blur-[2px] scale-105 animate-hero-bg transition-transform duration-1000"
          style={{ backgroundImage: "url('/images/pabellon-sergio-scariolo.jpg')" }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background via-background/85 to-transparent" />

        <div className="absolute -right-20 -top-24 w-96 h-96 rounded-full bg-primary-container/10 blur-3xl pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex items-center gap-2 mb-2">
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
            Compromiso firme de {CLUB_INFO.federationRegisteredName} con la inclusión digital, garantizando el acceso universal a la información deportiva y federativa para todas las personas.
          </p>
        </div>
      </section>

      {/* Contenido */}
      <section className="max-w-5xl mx-auto px-4 lg:px-8 py-12 relative z-10">
        <div className="space-y-10 text-on-surface font-body-sm text-sm sm:text-base leading-relaxed">
          {/* 1. Compromiso y Marco Legal */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-xs">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">accessibility_new</span>
              <span>Compromiso Institucional</span>
            </div>
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              1. Compromiso con la Accesibilidad y Marco Normativo
            </h2>
            <p className="text-tertiary">
              El <strong>C.D. Voleibol San Pedro</strong> tiene como principio fundacional el fomento del deporte sin barreras. Este principio se traslada plenamente a su entorno digital, comprometiéndose a hacer accesible su sitio web oficial a todos los usuarios, con independencia de sus capacidades físicas, sensoriales o cognitivas, o de las tecnologías de asistencia que empleen.
            </p>
            <p className="text-tertiary">
              El diseño técnico, desarrollo y maquetación de este portal se fundamentan en las siguientes normativas y estándares de referencia:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-surface-container-low p-4 border border-white/5 space-y-1">
                <span className="text-xs uppercase font-bold text-primary block">Norma UNE-EN 301 549:2022</span>
                <span className="text-white font-semibold">Requisitos de accesibilidad TIC</span>
                <p className="text-xs text-tertiary">Estándar europeo armonizado para productos y servicios de tecnologías de la información y la comunicación.</p>
              </div>
              <div className="bg-surface-container-low p-4 border border-white/5 space-y-1">
                <span className="text-xs uppercase font-bold text-primary block">WCAG 2.1 - Nivel AA</span>
                <span className="text-white font-semibold">W3C / WAI</span>
                <p className="text-xs text-tertiary">Pautas de Accesibilidad para el Contenido Web en sus principios de perceptibilidad, operabilidad, comprensibilidad y robustez.</p>
              </div>
              <div className="bg-surface-container-low p-4 border border-white/5 space-y-1">
                <span className="text-xs uppercase font-bold text-primary block">Real Decreto 1112/2018</span>
                <span className="text-white font-semibold">Accesibilidad web y apps móviles</span>
                <p className="text-xs text-tertiary">Disposición legislativa española relativa a la accesibilidad de sitios web y aplicaciones para dispositivos móviles.</p>
              </div>
              <div className="bg-surface-container-low p-4 border border-white/5 space-y-1">
                <span className="text-xs uppercase font-bold text-primary block">Ley 11/2023, de 8 de mayo</span>
                <span className="text-white font-semibold">Transposición Directiva (UE) 2019/882</span>
                <p className="text-xs text-tertiary">Ley europea de accesibilidad aplicable a servicios y portales digitales interactivos.</p>
              </div>
            </div>
          </div>

          {/* 2. Situación de Cumplimiento */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-3">
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              2. Situación de Cumplimiento
            </h2>
            <div className="p-4 bg-surface-container-low border-l-4 border-emerald-500 space-y-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-[20px]" aria-hidden="true">check_circle</span>
                <span className="text-white font-bold uppercase tracking-wider text-sm">
                  Plenamente Conforme con WCAG 2.1 Nivel AA
                </span>
              </div>
              <p className="text-xs text-tertiary leading-relaxed">
                El presente sitio web oficial (<strong className="text-white">C.D. Voleibol San Pedro</strong>) es plenamente conforme con el estándar europeo <strong className="text-white">UNE-EN 301 549:2022</strong> y satisface los criterios de conformidad de nivel AA establecidos en las <strong className="text-white">Pautas WCAG 2.1</strong> del World Wide Web Consortium (W3C).
              </p>
            </div>
          </div>

          {/* 3. Medidas Técnicas Implementadas */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-4">
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              3. Medidas Técnicas y Criterios de Accesibilidad Aplicados
            </h2>
            <p className="text-tertiary">
              Para asegurar una experiencia óptima a cualquier usuario o dispositivo de asistencia, se han integrado las siguientes soluciones técnicas:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface-container-low p-4 border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold">
                  <span className="material-symbols-outlined text-primary text-[18px]" aria-hidden="true">keyboard</span>
                  <span>Navegación Íntegra por Teclado</span>
                </div>
                <p className="text-xs text-tertiary leading-relaxed">
                  Todos los enlaces, botones y componentes interactivos son accesibles mediante tabulación secuencial lógica. Se implementa un anillo visible de foco personalizado (<code className="text-primary font-mono">:focus-visible</code>) de 2px en tono rojo club con separación de 3px para máxima visibilidad.
                </p>
              </div>

              <div className="bg-surface-container-low p-4 border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold">
                  <span className="material-symbols-outlined text-primary text-[18px]" aria-hidden="true">shortcut</span>
                  <span>Enlace de Salto Accesible (Skip Link)</span>
                </div>
                <p className="text-xs text-tertiary leading-relaxed">
                  Se ha dispuesto como primer elemento interactivo del documento un salto directo al contenido principal (<code className="text-primary font-mono">#main-content</code>), permitiendo a usuarios de lectores de pantalla y navegación por teclado obviar la cabecera fija de navegación.
                </p>
              </div>

              <div className="bg-surface-container-low p-4 border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold">
                  <span className="material-symbols-outlined text-primary text-[18px]" aria-hidden="true">contrast</span>
                  <span>Contraste Cromático de Nivel AA</span>
                </div>
                <p className="text-xs text-tertiary leading-relaxed">
                  Las combinaciones tipográficas sobre el fondo oscuro institucional han sido auditadas para superar holgadamente la relación mínima de contraste de 4.5:1 en textos estándar y 3:1 en títulos y elementos gráficos esenciales según el criterio WCAG 1.4.3.
                </p>
              </div>

              <div className="bg-surface-container-low p-4 border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold">
                  <span className="material-symbols-outlined text-primary text-[18px]" aria-hidden="true">code</span>
                  <span>Semántica HTML5 y Atributos ARIA</span>
                </div>
                <p className="text-xs text-tertiary leading-relaxed">
                  Estructuración con regiones semánticas nativas (<code className="text-white font-mono">&lt;header&gt;</code>, <code className="text-white font-mono">&lt;main&gt;</code>, <code className="text-white font-mono">&lt;footer&gt;</code>, <code className="text-white font-mono">&lt;nav&gt;</code>). Uso riguroso de roles modales, <code className="text-primary font-mono">aria-expanded</code>, <code className="text-primary font-mono">aria-controls</code>, títulos explícitos y ocultación de iconos decorativos con <code className="text-primary font-mono">aria-hidden=&quot;true&quot;</code>.
                </p>
              </div>

              <div className="bg-surface-container-low p-4 border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold">
                  <span className="material-symbols-outlined text-primary text-[18px]" aria-hidden="true">motion_photos_off</span>
                  <span>Reducción de Movimiento (Prefers-Reduced-Motion)</span>
                </div>
                <p className="text-xs text-tertiary leading-relaxed">
                  Pausa interactiva automática al situar el cursor (<code className="text-primary font-mono">:hover</code>) o enfocar elementos en movimiento para una lectura cómoda y accesible, junto a la desactivación de efectos de brillo o zooms ambientales decorativos bajo <code className="text-primary font-mono">prefers-reduced-motion: reduce</code>.
                </p>
              </div>

              <div className="bg-surface-container-low p-4 border border-white/5 space-y-2">
                <div className="flex items-center gap-2 text-white font-bold">
                  <span className="material-symbols-outlined text-primary text-[18px]" aria-hidden="true">table_chart</span>
                  <span>Tablas y Formularios Accesibles</span>
                </div>
                <p className="text-xs text-tertiary leading-relaxed">
                  Las tablas de clasificaciones y cookies cuentan con subtítulos descriptivos (<code className="text-white font-mono">&lt;caption&gt;</code>) y encabezados con atributo de ámbito <code className="text-primary font-mono">scope=&quot;col&quot;</code>. Los formularios e interruptores disponen de etiquetas asociadas unívocamente mediante <code className="text-primary font-mono">id</code> y <code className="text-primary font-mono">aria-label</code>.
                </p>
              </div>
            </div>
          </div>

          {/* 4. Preparación de la Declaración */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-3">
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              4. Preparación de la Presente Declaración
            </h2>
            <p className="text-tertiary">
              La presente declaración fue preparada y redactada el <strong className="text-white">19 de octubre de 2026</strong>.
            </p>
            <p className="text-tertiary">
              El método empleado para preparar la declaración ha sido una <strong>autoevaluación técnica exhaustiva</strong> llevada a cabo por el equipo de ingeniería de software del club, mediante análisis de código fuente en Next.js / TypeScript, validación de contrastes WCAG y pruebas de navegación por teclado y lectores de pantalla.
            </p>
          </div>

          {/* 5. Contacto y Comunicaciones */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-4">
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              5. Comunicaciones, Sugerencias y Procedimiento de Reclamación
            </h2>
            <p className="text-tertiary">
              Si encuentras alguna barrera de acceso en nuestro portal o deseas trasladarnos una sugerencia de mejora de accesibilidad, dispones de los siguientes canales de contacto directo:
            </p>
            <div className="bg-surface-container-low p-4 sm:p-6 border border-white/5 space-y-3">
              <p><strong className="text-white">Correo electrónico de contacto:</strong>{' '}
                <a href={`mailto:${CLUB_INFO.contactEmail}`} className="text-primary font-bold hover:underline">
                  {CLUB_INFO.contactEmail}
                </a>
              </p>
              <p><strong className="text-white">Dirección postal:</strong> {CLUB_INFO.officialAddress}, 29670 San Pedro Alcántara, Marbella (Málaga)</p>
              <p><strong className="text-white">Asunto recomendado:</strong> Accesibilidad Web - C.D. Voleibol San Pedro</p>
              <p className="text-xs text-tertiary pt-2 border-t border-white/5">
                Las comunicaciones serán atendidas por la secretaría técnica del club en un plazo máximo de quince (15) días hábiles. En caso de respuesta no satisfactoria, el usuario puede ejercer el procedimiento de reclamación previsto en el artículo 13 del Real Decreto 1112/2018 o elevar su consulta ante los organismos de consumo y derechos de las personas con discapacidad competentes en la Comunidad Autónoma de Andalucía.
              </p>
            </div>
          </div>

          {/* Enlaces de pie de página */}
          <div className="p-6 bg-surface-container-low border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-white font-semibold">Transparencia y marco legal del club</p>
              <p className="text-xs text-tertiary">Consulta las condiciones de uso, aviso legal y políticas de privacidad.</p>
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
