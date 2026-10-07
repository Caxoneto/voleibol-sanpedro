import type { Metadata } from 'next';
import Link from 'next/link';
import { CLUB_INFO } from '@/lib/data-store';

export const metadata: Metadata = {
  title: 'Aviso Legal | C.D. Voleibol San Pedro',
  description:
    'Información legal, datos identificativos y condiciones de uso del portal oficial del C.D. Voleibol San Pedro según la LSSI-CE.',
};

export default function AvisoLegalPage() {
  return (
    <div className="w-full min-h-screen bg-background">
      {/* Cabecera */}
      <section className="relative w-full bg-surface-container-lowest px-4 lg:px-8 py-12 border-b border-white/5 overflow-hidden">
        <div className="absolute -right-20 -top-24 w-96 h-96 rounded-full bg-primary-container/10 blur-3xl pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-primary-container text-white text-[11px] uppercase font-bold tracking-widest">
              MARCO LEGAL Y TRANSPARENCIA
            </span>
            <span className="text-xs text-tertiary uppercase tracking-wider">
              LSSI-CE LEY 34/2002
            </span>
          </div>
          <h1 className="font-display-xl text-4xl sm:text-5xl lg:text-6xl uppercase text-white tracking-tight leading-none">
            AVISO LEGAL
          </h1>
          <p className="font-body-md text-sm sm:text-base text-tertiary max-w-2xl mt-2">
            Condiciones generales de uso, titularidad del dominio y régimen de responsabilidades del portal web oficial de {CLUB_INFO.federationRegisteredName}.
          </p>
        </div>
      </section>

      {/* Contenido Legal */}
      <section className="max-w-5xl mx-auto px-4 lg:px-8 py-12">
        <div className="space-y-10 text-on-surface font-body-sm text-sm sm:text-base leading-relaxed">
          {/* 1. Datos Identificativos */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-xs">
              <span className="material-symbols-outlined text-[18px]">badge</span>
              <span>Artículo 10 LSSI-CE</span>
            </div>
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              1. Datos Identificativos del Responsable
            </h2>
            <p className="text-tertiary">
              En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se facilitan a continuación los datos del titular del presente portal:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="bg-surface-container-low p-4 border border-white/5 space-y-1">
                <span className="text-xs uppercase font-bold text-primary block">Denominación Oficial</span>
                <span className="text-white font-semibold">{CLUB_INFO.federationRegisteredName}</span>
                <span className="text-xs text-tertiary block">Nombre representativo: {CLUB_INFO.name}</span>
              </div>
              <div className="bg-surface-container-low p-4 border border-white/5 space-y-1">
                <span className="text-xs uppercase font-bold text-primary block">CIF / NIF</span>
                <span className="text-white font-semibold">{CLUB_INFO.cif}</span>
                <span className="text-xs text-tertiary block">Club Deportivo sin ánimo de lucro</span>
              </div>
              <div className="bg-surface-container-low p-4 border border-white/5 space-y-1">
                <span className="text-xs uppercase font-bold text-primary block">Domicilio Social Legal</span>
                <span className="text-white font-semibold">{CLUB_INFO.officialAddress}</span>
                <span className="text-xs text-tertiary block">San Pedro Alcántara, Marbella (Málaga), España</span>
              </div>
              <div className="bg-surface-container-low p-4 border border-white/5 space-y-1">
                <span className="text-xs uppercase font-bold text-primary block">Presidencia y Representación</span>
                <span className="text-white font-semibold">{CLUB_INFO.president}</span>
                <span className="text-xs text-tertiary block">Presidente y Director Técnico</span>
              </div>
              <div className="bg-surface-container-low p-4 border border-white/5 space-y-1">
                <span className="text-xs uppercase font-bold text-primary block">Sede Deportiva y Juego</span>
                <span className="text-white font-semibold">{CLUB_INFO.venueName}</span>
                <span className="text-xs text-tertiary block">{CLUB_INFO.venueAddress}</span>
              </div>
              <div className="bg-surface-container-low p-4 border border-white/5 space-y-1">
                <span className="text-xs uppercase font-bold text-primary block">Contacto Oficial</span>
                <a href={`mailto:${CLUB_INFO.contactEmail}`} className="text-primary font-semibold hover:underline block">
                  {CLUB_INFO.contactEmail}
                </a>
                <span className="text-xs text-tertiary block">Atención a deportistas, socios y familias</span>
              </div>
            </div>
            <p className="text-xs text-tertiary pt-2 border-t border-white/5">
              Entidad deportiva debidamente inscrita en el Registro Andaluz de Entidades Deportivas de la Junta de Andalucía y federada en la Federación Andaluza de Voleibol (FAVB) y en la Real Federación Española de Voleibol (RFEVB).
            </p>
          </div>

          {/* 2. Objeto */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-3">
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              2. Objeto y Ámbito de Aplicación
            </h2>
            <p className="text-tertiary">
              El presente sitio web tiene por finalidad difundir las actividades deportivas, formativas y sociales del {CLUB_INFO.federationRegisteredName}, facilitar los calendarios de competición federada oficial de la FAVB, divulgar noticias de actualidad de nuestras categorías base y senior, así como promover la captación de nuevos canteranos, socios y patrocinadores locales.
            </p>
            <p className="text-tertiary">
              El acceso y navegación por este portal atribuye la condición de <strong className="text-white">USUARIO</strong>, implicando la aceptación plena y sin reservas de todas las disposiciones incluidas en este Aviso Legal y en las políticas vinculadas.
            </p>
          </div>

          {/* 3. Condiciones de Uso */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-3">
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              3. Condiciones Generales de Uso
            </h2>
            <p className="text-tertiary">
              El usuario se compromete a hacer un uso adecuado y lícito de los contenidos y servicios de la web de conformidad con la ley vigente, la moral, las buenas costumbres y el orden público. Queda expresamente prohibido:
            </p>
            <ul className="list-disc list-inside space-y-2 text-tertiary pl-2">
              <li>Incurrir en actividades ilícitas, ilegales o contrarias a la buena fe y al orden público.</li>
              <li>Difundir contenidos o propaganda de carácter racista, xenófobo, denigratorio o atentatorio contra los valores del deporte y la infancia.</li>
              <li>Provocar daños en los sistemas físicos y lógicos del portal, de sus proveedores o de terceras personas, o introducir virus informáticos.</li>
              <li>Intentar acceder, manipular o utilizar indebidamente datos de otros usuarios, deportistas o miembros del club.</li>
            </ul>
          </div>

          {/* 4. Propiedad Intelectual */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-3">
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              4. Propiedad Intelectual e Industrial
            </h2>
            <p className="text-tertiary">
              Todos los contenidos del portal (textos, fotografías, logotipos, imágenes deportivas, diseños gráficos, código fuente, estructura de navegación, marcas y signos distintivos) son titularidad de {CLUB_INFO.federationRegisteredName} o, en su caso, de terceros que han autorizado expresamente su uso o de fuentes federativas públicas (FAVB / RFEVB).
            </p>
            <p className="text-tertiary">
              Queda expresamente prohibida la reproducción, distribución, comunicación pública y transformación de la totalidad o parte de los contenidos con fines comerciales sin la autorización previa y por escrito del Club.
            </p>
          </div>

          {/* 5. Exclusión de Responsabilidad y Enlaces */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-3">
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              5. Exclusión de Garantías y Responsabilidad
            </h2>
            <p className="text-tertiary">
              El Club no se hace responsable de los daños y perjuicios de cualquier naturaleza que pudieran derivarse de interferencias, omisiones, interrupciones, virus informáticos o desconexiones en el funcionamiento del sistema electrónico ajenos a su control.
            </p>
            <p className="text-tertiary">
              Asimismo, la web contiene enlaces a plataformas externas (tales como la Federación Andaluza de Voleibol en <a href="https://favoley.net" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">favoley.net</a>, Google Maps o FeelSports). El Club no ejerce control sobre dichos sitios ni asume responsabilidad por sus contenidos ni sus políticas de privacidad.
            </p>
          </div>

          {/* 6. Legislación y Fuero */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-3">
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              6. Legislación Aplicable y Jurisdicción
            </h2>
            <p className="text-tertiary">
              Las presentes condiciones se rigen en todos y cada uno de sus extremos por la legislación española. Para la resolución de cualquier controversia judicial relativa al portal, las partes se someten a los Juzgados y Tribunales de <strong className="text-white">Marbella (Málaga)</strong>, con renuncia expresa a cualquier otro fuero que pudiera corresponderles salvo que la normativa de consumidores disponga imperativamente lo contrario.
            </p>
          </div>

          {/* Enlaces de interés */}
          <div className="p-6 bg-surface-container-low border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-white font-semibold">¿Tienes dudas o necesitas más información?</p>
              <p className="text-xs text-tertiary">Consulta nuestra Política de Privacidad o contacta con la secretaría del club.</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/privacidad"
                className="px-4 py-2 bg-surface-container-highest hover:bg-surface-container text-white text-xs uppercase font-bold tracking-wider transition-colors border border-white/10"
              >
                Política de Privacidad
              </Link>
              <Link
                href="/cookies"
                className="px-4 py-2 bg-primary-container hover:bg-secondary-container text-white text-xs uppercase font-bold tracking-wider transition-colors"
              >
                Política de Cookies
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
