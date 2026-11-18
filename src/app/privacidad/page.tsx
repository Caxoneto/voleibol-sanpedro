import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ShieldCheck,
  Volleyball,
  Users,
  Handshake,
  Camera,
  Lock,
  Globe,
  Clock,
  Scale,
  Mail,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { CLUB_INFO } from '@/lib/club-info';

export const metadata: Metadata = {
  title: 'Política de Privacidad | C.D. Voleibol San Pedro',
  description:
    'Información detallada sobre protección de datos personales, tratamiento de menores, bases jurídicas, plazos de conservación y ejercicio de derechos según RGPD y LOPDGDD en el C.D. Voleibol San Pedro.',
};

export default function PrivacidadPage() {
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
              PROTECCIÓN DE DATOS
            </span>
            <span className="text-xs text-tertiary uppercase tracking-wider">
              RGPD (UE 2016/679) &amp; LOPDGDD 3/2018
            </span>
          </div>
          <h1 className="font-display-xl text-4xl sm:text-5xl lg:text-6xl uppercase text-white tracking-tight leading-none">
            POLÍTICA DE PRIVACIDAD
          </h1>
          <p className="font-body-md text-sm sm:text-base text-tertiary max-w-2xl mt-2">
            Información transparente sobre cómo {CLUB_INFO.federationRegisteredName} recaba, protege, conserva y garantiza los derechos sobre los datos personales de deportistas, menores, familias, colaboradores y usuarios del portal.
          </p>
        </div>
      </section>

      {/* Contenido */}
      <section className="max-w-5xl mx-auto px-4 lg:px-8 py-12 relative z-10">
        <div className="space-y-10 text-on-surface font-body-sm text-sm sm:text-base leading-relaxed">
          {/* 1. Responsable del Tratamiento */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-xs">
              <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Responsable del Tratamiento (Art. 13.1.a RGPD)</span>
            </div>
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              1. ¿Quién es el responsable de tus datos?
            </h2>
            <div className="bg-surface-container-low p-4 sm:p-6 border border-white/5 space-y-2 text-sm">
              <p>
                <strong className="text-white">Identidad:</strong> {CLUB_INFO.federationRegisteredName} (nombre representativo: {CLUB_INFO.name})
              </p>
              <p>
                <strong className="text-white">CIF:</strong> {CLUB_INFO.cif}
              </p>
              <p>
                <strong className="text-white">Domicilio Social:</strong> {CLUB_INFO.officialAddress}
              </p>
              <p>
                <strong className="text-white">Representante Legal:</strong> {CLUB_INFO.president} (Presidente)
              </p>
              <p>
                <strong className="text-white">Teléfono de Secretaría:</strong> {CLUB_INFO.contactPhone}
              </p>
              <p>
                <strong className="text-white">Canal oficial de contacto y derechos RGPD (sin DPD preceptivo, Art. 37 RGPD):</strong>{' '}
                <a href={`mailto:${CLUB_INFO.contactEmail}`} className="text-primary font-semibold hover:underline">
                  {CLUB_INFO.contactEmail}
                </a>
              </p>
            </div>
          </div>

          {/* 2. Finalidades */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-4">
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              2. ¿Con qué finalidades tratamos los datos personales?
            </h2>
            <p className="text-tertiary">
              Tratamos exclusivamente los datos adecuados, pertinentes y limitados a cada finalidad deportiva, federativa o administrativa:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface-container-low p-4 border border-white/5">
                <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                  <Volleyball className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                  <span>Deportistas Federados y Cantera</span>
                </h3>
                <p className="text-xs text-tertiary leading-relaxed">
                  Tramitación de licencias ante FAVB, RFEVB y Liga AFADE, organización de entrenamientos, convocatorias, actas oficiales de competición, cobertura de seguro médico deportivo obligatorio y desplazamientos en transportes oficiales del club cuando estén expresamente autorizados.
                </p>
              </div>
              <div className="bg-surface-container-low p-4 border border-white/5">
                <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                  <span>Familias, Tutores y Menores (Art. 7 LOPDGDD · Art. 14 RGPD)</span>
                </h3>
                <p className="text-xs text-tertiary leading-relaxed">
                  Gestión digital y presencial de autorizaciones conforme al Protocolo Marco de Menores de la Junta de Andalucía (Orden de 18 de noviembre de 2024, BOJA núm. 229): para menores de 18 años la autorización conjunta de imagen y desplazamientos la formaliza su padre, madre o tutor legal (informando al/a la menor de 14 a 17 años y contando con su asentimiento, quien conserva su derecho personal a oponerse o retirar su consentimiento de imagen en cualquier momento). Cuando los datos identificativos básicos o deportivos no procedan directamente del titular, tienen origen en sus representantes legales o en las inscripciones y actas oficiales de competición (FAVB/AFADE).
                </p>
              </div>
              <div className="bg-surface-container-low p-4 border border-white/5">
                <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                  <span>Imágenes, Plantillas Web y Actas Deportivas</span>
                </h3>
                <p className="text-xs text-tertiary leading-relaxed">
                  Captación, tratamiento y difusión no lucrativa de imágenes deportivas conforme a la Orden de 18 de noviembre de 2024 de la Junta de Andalucía (web oficial, redes sociales institucionales, retransmisiones, memorias, cartelería y prensa deportiva), siempre mediante autorización específica y sin uso comercial ni cesión a patrocinadores. En plantillas y actas públicas se aplica minimización estricta y regla de ocultación por defecto (<em>default-deny</em>) en fotografías y menores sin autorización activa, pudiendo oponerse en cualquier momento.
                </p>
              </div>
              <div className="bg-surface-container-low p-4 border border-white/5">
                <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                  <Handshake className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
                  <span>Patrocinadores, Prensa y Seguridad del Portal</span>
                </h3>
                <p className="text-xs text-tertiary leading-relaxed">
                  Atención de solicitudes de patrocinio deportivo y acreditaciones de prensa remitidas a través de los formularios del portal, así como el control técnico antifraude, verificación OTP por correo censado y limitación de tasa de peticiones en nuestros servicios digitales.
                </p>
              </div>
            </div>
          </div>

          {/* 3. Base Jurídica y Obligación de Suministro */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-xs">
              <Scale className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Legitimación y Obligatoriedad (Art. 6, 13.1.c y 13.2.e RGPD)</span>
            </div>
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              3. Bases jurídicas y obligatoriedad de facilitar los datos
            </h2>
            <ul className="list-disc list-inside space-y-2.5 text-tertiary pl-1 text-sm">
              <li>
                <strong className="text-white">Ejecución de la relación asociativa y deportiva (Art. 6.1.b RGPD):</strong> inscripción del deportista, gestión de entrenamientos, convocatorias y licencias de competición.
              </li>
              <li>
                <strong className="text-white">Cumplimiento de obligaciones legales (Art. 6.1.c RGPD):</strong> Ley 5/2016 del Deporte de Andalucía, LO 8/2021 (LOPIVI), seguro obligatorio de accidentes deportivos, normativa fiscal aplicable y acreditación de autorizaciones parentales.
              </li>
              <li>
                <strong className="text-white">Consentimiento expreso (Art. 6.1.a RGPD, Art. 7 LOPDGDD y LO 1/1982):</strong> captación, tratamiento y difusión deportiva no lucrativa de imagen (Orden de 18/11/2024, BOJA núm. 229), autorización de desplazamientos oficiales y envío de formularios de patrocinio o acreditación de prensa.
              </li>
              <li>
                <strong className="text-white">Interés legítimo (Art. 6.1.f RGPD):</strong> prevención de abusos técnicos en la plataforma (limitación de tasa e integridad de sesiones) y difusión informativa minimizada de resultados y actas federativas oficiales de mayores de edad o deportistas autorizados, ponderada frente al derecho de oposición (Art. 21 RGPD) y la protección reforzada del menor.
              </li>
            </ul>
            <div className="p-4 bg-surface-container-low border border-white/10 space-y-2">
              <h3 className="text-white font-bold text-sm">
                Carácter obligatorio o facultativo de los datos solicitados (Art. 13.2.e RGPD)
              </h3>
              <p className="text-xs text-tertiary leading-relaxed">
                Los datos marcados como obligatorios en el censo y en los trámites de autorización (nombre completo, fecha de nacimiento, documento identificativo, datos y firma del representante legal en menores y correo censado para verificación OTP) son un <strong className="text-white">requisito legal y federativo necesario</strong> para tramitar la ficha deportiva o formalizar una autorización digital verificable; no aportarlos impide completar dicho trámite por vía electrónica (manteniéndose disponible la entrega presencial en secretaría). Por el contrario, el otorgamiento de autorizaciones de imagen promocional o de traslado en vehículos del club es <strong className="text-white">estrictamente voluntario</strong>: su denegación o revocación no impide en ningún caso la práctica deportiva del jugador en el club.
              </p>
            </div>
          </div>

          {/* 4. Destinatarios y Transferencias Internacionales */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-xs">
              <Globe className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Destinatarios y Capítulo V RGPD</span>
            </div>
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              4. ¿A qué destinatarios se comunican y dónde se alojan los datos?
            </h2>
            <p className="text-tertiary">
              Los datos no se ceden a terceros con fines comerciales ni a empresas patrocinadoras para campañas ajenas al club. Únicamente se comunican por necesidad federativa o legal a:
            </p>
            <ul className="list-disc list-inside space-y-2 text-tertiary pl-1 text-sm">
              <li>
                <strong className="text-white">Federación Andaluza de Voleibol (FAVB), RFEVB y Liga AFADE:</strong> tramitación de licencias, actas arbitrales y calendarios oficiales.
              </li>
              <li>
                <strong className="text-white">Compañía aseguradora deportiva obligatoria:</strong> asistencia sanitaria y cobertura de accidentes en entrenamientos y partidos.
              </li>
              <li>
                <strong className="text-white">Administraciones Públicas y Patronato Municipal de Deportes de Marbella:</strong> acreditación de uso de instalaciones deportivas municipales y cumplimiento normativo vigente.
              </li>
            </ul>

            <div className="bg-surface-container-low p-4 sm:p-5 border border-white/10 space-y-3">
              <h3 className="text-white font-bold text-sm">
                Encargados del Tratamiento y Transferencias Internacionales (Arts. 28, 44–46 RGPD)
              </h3>
              <ul className="space-y-2 text-xs text-tertiary leading-relaxed">
                <li>
                  <strong className="text-white">Base de datos PostgreSQL (Neon):</strong> alojada íntegramente en el <strong className="text-white">Espacio Económico Europeo (Frankfurt, Alemania — región eu-central-1)</strong> bajo contrato de encargo de tratamiento (Art. 28 RGPD).
                </li>
                <li>
                  <strong className="text-white">Correo institucional y códigos OTP (Zoho Mail EU):</strong> servicio operado desde centros de datos en la <strong className="text-white">Unión Europea</strong> bajo contrato de encargo de tratamiento (Art. 28 RGPD).
                </li>
                <li>
                  <strong className="text-white">Alojamiento web y funciones serverless (Netlify, Inc. — EE. UU. / red CDN global):</strong> las peticiones web y ejecuciones efímeras en servidor transitan por infraestructura de Netlify, entidad adherida al <strong className="text-white">Marco de Privacidad de Datos UE-EE. UU. (EU-U.S. Data Privacy Framework)</strong> y sujeta a <strong className="text-white">Cláusulas Contractuales Tipo (SCC)</strong> aprobadas por la Comisión Europea conforme a los Arts. 45 y 46 RGPD. Conforme al Art. 13.1.f RGPD, puedes consultar el marco de privacidad de Netlify en{' '}
                  <a
                    href="https://www.netlify.com/privacy/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:text-white transition-colors"
                  >
                    netlify.com/privacy
                  </a>{' '}
                  o solicitar copia de las garantías aplicables escribiendo a{' '}
                  <a
                    href={`mailto:${CLUB_INFO.contactEmail}`}
                    className="text-primary underline hover:text-white transition-colors"
                  >
                    {CLUB_INFO.contactEmail}
                  </a>.
                </li>
              </ul>
              <p className="text-[11px] text-tertiary pt-2 border-t border-white/5">
                Nota de minimización de red: este portal autoaloja sus tipografías, iconos e imágenes editoriales en infraestructura propia, evitando cargas automáticas de recursos hacia Google Fonts o bancos de imágenes externos.
              </p>
            </div>
          </div>

          {/* 5. Seguridad Técnica */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-xs">
              <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Medidas Técnicas y Organizativas (Art. 32 RGPD)</span>
            </div>
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              5. Seguridad técnica real aplicada en el portal
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-tertiary leading-relaxed">
              <div className="bg-surface-container-low p-4 border border-white/5 space-y-1.5">
                <h3 className="text-white font-bold text-sm">Cifrado en tránsito (TLS / HTTPS)</h3>
                <p>
                  Todas las comunicaciones entre el navegador del usuario, el servidor web, el servicio SMTP (Zoho EU) y la base de datos en Frankfurt se efectúan sobre canales cifrados mediante TLS y cabeceras HSTS de transporte seguro.
                </p>
              </div>
              <div className="bg-surface-container-low p-4 border border-white/5 space-y-1.5">
                <h3 className="text-white font-bold text-sm">Cifrado en reposo en servidor (AES-256-GCM)</h3>
                <p>
                  Los datos identificativos sensibles (DNI/NIE, fecha de nacimiento, teléfono, correo y trazos de firma) se cifran en servidor antes de persistirse en base de datos mediante AES-256-GCM autenticado con derivación de claves HKDF-SHA256 e índices ciegos HMAC para búsquedas sin exposición en claro. Las evidencias de consentimiento se sellan con HMAC-SHA256 independiente y no se almacenan secretos en código ni en caché pública.
                </p>
              </div>
            </div>
          </div>

          {/* 6. Plazos de Conservación y Supresión */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-xs">
              <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Plazos de Conservación y Bloqueo (Art. 13.2.a y 5.1.e RGPD · Art. 32 LOPDGDD)</span>
            </div>
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              6. ¿Cuánto tiempo conservamos cada categoría de datos?
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <caption className="sr-only">Plazos de conservación y bloqueo legal por finalidad</caption>
                <thead>
                  <tr className="border-b border-white/10 text-white uppercase font-bold tracking-wider bg-surface-container-low">
                    <th scope="col" className="p-3">Tratamiento / Finalidad</th>
                    <th scope="col" className="p-3">Plazo Activo</th>
                    <th scope="col" className="p-3">Bloqueo Legal y Supresión / Anonimización</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-tertiary">
                  <tr>
                    <td className="p-3 font-semibold text-white">Censo deportivo, licencias y desplazamientos</td>
                    <td className="p-3">Durante la temporada y vinculación activa con el club.</td>
                    <td className="p-3">Bloqueo durante <strong className="text-white">5 años</strong> tras la baja (o tras alcanzar la mayoría de edad si era menor) para prescripción civil/deportiva (Art. 1964 CC) y hasta <strong className="text-white">6 años</strong> si existieran obligaciones contables/fiscales (Art. 30 CCom).</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-white">Imágenes y difusión (Web, RRSS, Streaming, Prensa)</td>
                    <td className="p-3">Mientras se mantenga vigente el consentimiento expreso.</td>
                    <td className="p-3">Retirada inmediata del uso activo tras revocación u oposición; la prueba del consentimiento/revocación queda bloqueada <strong className="text-white">4 años</strong> (Art. 9.5 LO 1/1982) y hasta <strong className="text-white">5 años</strong> (Art. 72 LOPDGDD / Art. 1964 CC).</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-white">Auditoría probatoria de autorizaciones</td>
                    <td className="p-3">Registro de firma y revocación durante vínculo y bloqueo.</td>
                    <td className="p-3">Expirado el plazo de bloqueo legal (4–5 años), se ejecuta supresión definitiva o destrucción criptográfica de la clave asociada (<em>crypto-shredding</em>), conservando únicamente huellas no reidentificables.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-white">Solicitudes de patrocinio y acreditación de prensa</td>
                    <td className="p-3">Tramitación de la solicitud o vigencia del convenio.</td>
                    <td className="p-3">Máximo <strong className="text-white">12 meses</strong> tras el cierre de la gestión sin formalización, salvo obligación contractual o legal ulterior.</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-white">Registros técnicos de seguridad (OTP y tasa de uso)</td>
                    <td className="p-3">15 minutos (validez del código OTP) / ventanas breves anti-abuso.</td>
                    <td className="p-3">Purga automática en base de datos transcurridas 24 horas desde la expiración del reto OTP o expirada la ventana de tasa.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 7. Derechos del Usuario y Revocación */}
          <div className="bg-surface-container-lowest border border-white/5 p-6 sm:p-8 space-y-4">
            <h2 className="font-headline-sm text-xl sm:text-2xl text-white uppercase tracking-wide">
              7. ¿Cuáles son tus derechos, cómo revocar y cómo ejercerlos?
            </h2>
            <p className="text-tertiary">
              La normativa garantiza el control efectivo sobre tus datos personales (y los de tus hijos/as menores bajo tutela) mediante los siguientes derechos:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
                <span className="font-bold text-white text-xs block">Oposición</span>
                <span className="text-[11px] text-tertiary">Incluido nombre/foto web</span>
              </div>
              <div className="bg-surface-container-low p-3 border border-white/5 text-center">
                <span className="font-bold text-white text-xs block">Limitación</span>
                <span className="text-[11px] text-tertiary">Restringir su uso</span>
              </div>
              <div className="bg-surface-container-low p-3 border border-white/5 text-center">
                <span className="font-bold text-white text-xs block">Portabilidad</span>
                <span className="text-[11px] text-tertiary">Formato estructurado</span>
              </div>
              <div className="bg-surface-container-low p-3 border border-white/5 text-center sm:col-span-2">
                <span className="font-bold text-primary text-xs block">Revocación del Consentimiento (Art. 7.3 y 13.2.c RGPD)</span>
                <span className="text-[11px] text-tertiary">Retirable en cualquier momento sin efecto retroactivo</span>
              </div>
            </div>

            <div className="bg-surface-container-low p-4 sm:p-6 border border-white/10 space-y-3 text-xs sm:text-sm">
              <div className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                <div className="space-y-2 text-tertiary">
                  <p className="text-white font-semibold">Canales oficiales para revocación y ejercicio de derechos:</p>
                  <p>
                    <strong className="text-white">1. Revocación y modificación de autorizaciones online:</strong> puedes retirar o renovar el consentimiento en el portal{' '}
                    <Link href="/autorizaciones" className="text-primary font-bold hover:underline">
                      /autorizaciones
                    </Link>{' '}
                    mediante verificación por código OTP enviado al correo censado (efectividad inmediata desde su registro).
                  </p>
                  <p>
                    <strong className="text-white">2. Correo electrónico y postal:</strong> escribiendo a{' '}
                    <a href={`mailto:${CLUB_INFO.contactEmail}`} className="text-primary font-bold hover:underline">
                      {CLUB_INFO.contactEmail}
                    </a>{' '}
                    o por correo postal a <span className="text-white font-medium">{CLUB_INFO.officialAddress}</span>, indicando el derecho que deseas ejercer y el nombre del deportista.
                  </p>
                  <p>
                    <strong className="text-white">Verificación proporcional de identidad (Art. 12.6 RGPD):</strong> no exigimos la aportación sistemática de copia completa del DNI cuando tu solicitud pueda validarse por correo censado u otro factor equivalente; únicamente cuando existan dudas razonables sobre la identidad del solicitante podremos requerir información adicional proporcional para acreditarla.
                  </p>
                </div>
              </div>
              <div className="pt-3 border-t border-white/5 flex items-start gap-2 text-xs text-tertiary">
                <ShieldAlert className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
                <p>
                  <strong className="text-white">Reclamación ante la Autoridad de Control (Art. 13.2.d RGPD):</strong> si consideras que tus derechos no han sido atendidos adecuadamente, puedes presentar una reclamación ante la{' '}
                  <a
                    href="https://www.aepd.es"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-bold inline-flex items-center gap-1"
                  >
                    <span>Agencia Española de Protección de Datos (AEPD)</span>
                    <ExternalLink className="w-3 h-3" aria-hidden="true" />
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>

          {/* Enlaces de pie de página */}
          <div className="p-6 bg-surface-container-low border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-white font-semibold">Transparencia y cookies en este portal</p>
              <p className="text-xs text-tertiary">Consulta el detalle técnico del almacenamiento local y los datos identificativos del club.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
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
