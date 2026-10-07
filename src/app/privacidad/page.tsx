import type { Metadata } from 'next';
import Link from 'next/link';
import { CLUB_INFO } from '@/lib/data-store';

export const metadata: Metadata = {
  title: 'Política de Privacidad | C.D. Voleibol San Pedro',
  description:
    'Información sobre la protección de datos personales, finalidades y ejercicio de derechos según el RGPD y la LOPDGDD en el C.D. Voleibol San Pedro.',
};

export default function PrivacidadPage() {
  return (
    <div className="w-full min-h-screen bg-background">
      {/* Cabecera */}
      <section className="relative w-full bg-surface-container-lowest px-4 lg:px-8 py-12 border-b border-white/5 overflow-hidden">
        <div className="absolute -right-20 -top-24 w-96 h-96 rounded-full bg-primary-container/10 blur-3xl pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-primary-container text-white text-[11px] uppercase font-bold tracking-widest">
              PROTECCIÓN DE DATOS
            </span>
            <span className="text-xs text-tertiary uppercase tracking-wider">
              RGPD (UE 2016/679) & LOPDGDD 3/2018
            </span>
          </div>
          <h1 className="font-display-xl text-4xl sm:text-5xl lg:text-6xl uppercase text-white tracking-tight leading-none">
            POLÍTICA DE PRIVACIDAD
          </h1>
          <p className="font-body-md text-sm sm:text-base text-tertiary max-w-2xl mt-2">
            Compromiso de transparencia, seguridad y custodia de los datos de deportistas, canteranos, familias, socios y colaboradores de {CLUB_INFO.federationRegisteredName}.
          </p>
        </div>
      </section>

      {/* Contenido */}
      <section className="max-w-5xl mx-auto px-4 lg:px-8 py-12">
        <div className="space-y-10 text-on-surface font-body-sm text-sm sm:text-base leading-relaxed">
          {/* 1. Responsable */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-xs">
              <span className="material-symbols-outlined text-[18px]">security</span>
              <span>Responsable del Tratamiento</span>
            </div>
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              1. ¿Quién es el responsable de tus datos?
            </h2>
            <div className="bg-surface-container-low p-4 sm:p-6 border border-white/5 space-y-2">
              <p><strong className="text-white">Identidad:</strong> {CLUB_INFO.federationRegisteredName}</p>
              <p><strong className="text-white">CIF:</strong> {CLUB_INFO.cif}</p>
              <p><strong className="text-white">Domicilio Social:</strong> {CLUB_INFO.officialAddress}, 29670 San Pedro Alcántara, Marbella (Málaga)</p>
              <p><strong className="text-white">Representante Legal:</strong> {CLUB_INFO.president} (Presidente)</p>
              <p><strong className="text-white">Email de contacto y derechos:</strong> <a href={`mailto:${CLUB_INFO.contactEmail}`} className="text-primary hover:underline">{CLUB_INFO.contactEmail}</a></p>
            </div>
          </div>

          {/* 2. Finalidades */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-4">
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              2. ¿Con qué finalidades tratamos tus datos personales?
            </h2>
            <p className="text-tertiary">
              En el C.D. Voleibol San Pedro recopilamos y tratamos los datos estrictamente necesarios según la relación que mantengas con el club:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface-container-low p-4 border border-white/5">
                <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">sports_volleyball</span>
                  Cantera y Deportistas Federados
                </h3>
                <p className="text-xs text-tertiary leading-relaxed">
                  Tramitación de licencias oficiales ante la FAVB, gestión de entrenamientos, convocatorias de partidos oficiales, cobertura del seguro médico deportivo obligatorio y seguimiento deportivo de menores y seniors.
                </p>
              </div>
              <div className="bg-surface-container-low p-4 border border-white/5">
                <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">diversity_3</span>
                  Padres, Madres y Tutores Legales
                </h3>
                <p className="text-xs text-tertiary leading-relaxed">
                  Comunicación directa relativa a horarios de partidos, autorizaciones federativas, cuotas deportivas, emergencias médicas durante entrenamientos o desplazamientos y asambleas del club.
                </p>
              </div>
              <div className="bg-surface-container-low p-4 border border-white/5">
                <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">handshake</span>
                  Patrocinadores y Contacto Web
                </h3>
                <p className="text-xs text-tertiary leading-relaxed">
                  Atención de solicitudes de información, dudas recibidas a través de la web o correo electrónico y gestión de convenios de patrocinio con comercios locales.
                </p>
              </div>
              <div className="bg-surface-container-low p-4 border border-white/5">
                <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">photo_camera</span>
                  Imagen y Crónicas Deportivas
                </h3>
                <p className="text-xs text-tertiary leading-relaxed">
                  Publicación de reportajes fotográficos de partidos, fotos oficiales de equipos y crónicas de jornadas en la web oficial y redes del club, siempre con previa autorización firmada de los tutores en caso de menores de edad.
                </p>
              </div>
            </div>
          </div>

          {/* 3. Base Jurídica */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-4">
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              3. ¿Cuál es la base legal que legitima el tratamiento?
            </h2>
            <ul className="list-disc list-inside space-y-2 text-tertiary pl-2">
              <li><strong className="text-white">Ejecución de la relación asociativa/deportiva:</strong> Necesaria para la inscripción del deportista en el club y su participación en ligas federadas oficiales (Art. 6.1.b RGPD).</li>
              <li><strong className="text-white">Cumplimiento de obligaciones legales:</strong> Ley del Deporte de Andalucía, suscripción del seguro obligatorio deportivo para accidentes en competición y normativas fiscales (Art. 6.1.c RGPD).</li>
              <li><strong className="text-white">Consentimiento expreso:</strong> Prestado por el usuario o tutor legal al enviar formularios web de contacto, solicitar información de patrocinio o autorizar el uso de imágenes en redes/web (Art. 6.1.a RGPD).</li>
              <li><strong className="text-white">Interés legítimo:</strong> Velar por la seguridad de las instalaciones y coordinar la logística deportiva del club (Art. 6.1.f RGPD).</li>
            </ul>
          </div>

          {/* 4. Destinatarios y cesiones */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-4">
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              4. ¿A qué destinatarios se comunicarán tus datos?
            </h2>
            <p className="text-tertiary">
              Los datos no se cederán a terceros comerciales en ningún caso. Únicamente se comunicarán a las siguientes entidades por estricta necesidad deportiva o legal:
            </p>
            <ul className="list-disc list-inside space-y-2 text-tertiary pl-2">
              <li><strong className="text-white">Federación Andaluza de Voleibol (FAVB) y RFEVB:</strong> Para la expedición de licencias, fichas federativas y actas arbitrales.</li>
              <li><strong className="text-white">Compañía aseguradora médica:</strong> Para la cobertura de accidentes y asistencia sanitaria en entrenamientos y partidos oficiales.</li>
              <li><strong className="text-white">Administración Pública y Patronato Municipal de Deportes de Marbella:</strong> En cumplimiento de los requisitos para uso de las instalaciones del Pabellón Sergio Scariolo y normativas vigentes.</li>
              <li><strong className="text-white">Proveedores tecnológicos auxiliares:</strong> Servicios de alojamiento web y correo electrónico bajo acuerdos de confidencialidad conformes al RGPD.</li>
            </ul>
            <p className="text-xs text-tertiary pt-2 border-t border-white/5">
              No se realizan transferencias internacionales de datos fuera del Espacio Económico Europeo.
            </p>
          </div>

          {/* 5. Plazo de Conservación */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-3">
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              5. ¿Cuánto tiempo conservaremos tus datos?
            </h2>
            <p className="text-tertiary">
              Los datos personales de los deportistas y socios se conservarán durante el tiempo que dure su vinculación con el club. Una vez finalizada la relación, se mantendrán debidamente bloqueados durante los plazos legalmente exigibles para la prescripción de posibles responsabilidades civiles, deportivas o tributarias, tras lo cual se procederá a su supresión definitiva.
            </p>
          </div>

          {/* 6. Derechos del Usuario */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-4">
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              6. ¿Cuáles son tus derechos y cómo ejercerlos?
            </h2>
            <p className="text-tertiary">
              La normativa te garantiza el control de tus datos personales mediante el ejercicio de los siguientes derechos:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-surface-container-low p-3 border border-white/5 text-center">
                <span className="font-bold text-white text-xs block">Acceso</span>
                <span className="text-[11px] text-tertiary">Conocer qué datos tratamos</span>
              </div>
              <div className="bg-surface-container-low p-3 border border-white/5 text-center">
                <span className="font-bold text-white text-xs block">Rectificación</span>
                <span className="text-[11px] text-tertiary">Corregir datos inexactos</span>
              </div>
              <div className="bg-surface-container-low p-3 border border-white/5 text-center">
                <span className="font-bold text-white text-xs block">Supresión</span>
                <span className="text-[11px] text-tertiary">Solicitar su eliminación</span>
              </div>
              <div className="bg-surface-container-low p-3 border border-white/5 text-center">
                <span className="font-bold text-white text-xs block">Limitación</span>
                <span className="text-[11px] text-tertiary">Restringir su uso</span>
              </div>
              <div className="bg-surface-container-low p-3 border border-white/5 text-center">
                <span className="font-bold text-white text-xs block">Portabilidad</span>
                <span className="text-[11px] text-tertiary">Recibir tus datos en formato digital</span>
              </div>
              <div className="bg-surface-container-low p-3 border border-white/5 text-center">
                <span className="font-bold text-white text-xs block">Oposición</span>
                <span className="text-[11px] text-tertiary">Oponerte al tratamiento</span>
              </div>
            </div>
            <div className="bg-surface-container-low p-4 sm:p-6 border border-white/5 space-y-3">
              <p className="text-white font-semibold">Canal oficial para ejercer tus derechos:</p>
              <p className="text-tertiary text-xs sm:text-sm">
                Puedes ejercer cualquiera de estos derechos enviando un correo electrónico a{' '}
                <a href={`mailto:${CLUB_INFO.contactEmail}`} className="text-primary font-bold hover:underline">
                  {CLUB_INFO.contactEmail}
                </a>{' '}
                o mediante correo postal a nuestro domicilio social en <span className="text-white font-medium">{CLUB_INFO.officialAddress}, 29670 San Pedro Alcántara (Málaga)</span>, indicando en el asunto &quot;Protección de Datos&quot; y aportando copia o acreditación de identidad (DNI/NIE).
              </p>
              <p className="text-xs text-tertiary">
                Si consideras que no hemos atendido tus derechos de forma satisfactoria, tienes derecho a presentar una reclamación ante la <a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold">Agencia Española de Protección de Datos (AEPD)</a> a través de su sede electrónica.
              </p>
            </div>
          </div>

          {/* Enlaces de pie de página */}
          <div className="p-6 bg-surface-container-low border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-white font-semibold">Transparencia y cookies en este portal</p>
              <p className="text-xs text-tertiary">Conoce el detalle técnico de las cookies y almacenamiento en tu navegador.</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/aviso-legal"
                className="px-4 py-2 bg-surface-container-highest hover:bg-surface-container text-white text-xs uppercase font-bold tracking-wider transition-colors border border-white/10"
              >
                Aviso Legal
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
