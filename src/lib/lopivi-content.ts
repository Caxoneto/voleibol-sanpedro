/**
 * Contenidos oficiales, marco normativo y catálogos de la Ley LOPIVI
 * para el Club Deportivo Voleibol San Pedro (Temporada 2026/2027).
 *
 * Módulo puro y seguro para cliente y servidor (sin secretos ni dependencias Node).
 */

export type LopiviChannel =
  | 'CANAL_WEB'
  | 'PRESENCIAL'
  | 'TELEFONO'
  | 'EMAIL'
  | 'ESCRITO'
  | 'OTRO';

export type LopiviImmediateRisk = 'SI' | 'NO' | 'NO_DETERMINADO';

export type LopiviIncidentStatus =
  | 'RECIBIDA'
  | 'EN_VALORACION'
  | 'MEDIDAS_ADOPTADAS'
  | 'DERIVADA_AUTORIDADES'
  | 'EN_SEGUIMIENTO'
  | 'CERRADA';

export interface LopiviOptionMeta<T extends string = string> {
  value: T;
  label: string;
  shortLabel?: string;
  description?: string;
}

export const LOPIVI_DELEGATE = {
  name: 'Carlos Alberto Alcántara González',
  roleTitle: 'Presidente del C.D. Voleibol San Pedro',
  delegateTitle: 'Delegado de Protección de Menores',
  fullTitle: 'Presidente y Delegado de Protección de Menores',
  clubName: 'Club Deportivo Voleibol San Pedro',
  cif: 'G93147924',
  address: 'Calle Diego Piña Macías, 21. San Pedro Alcántara (Málaga)',
  email: 'voleibolsanpedro@hotmail.es',
  phone: '657 713 771',
  phoneHref: 'tel:+34657713771',
  scope: 'Todas las actividades deportivas y organizativas del club.',
  season: '2026/2027',
} as const;

export const LOPIVI_KEY_MESSAGES = {
  noProofNeeded:
    'No será necesario disponer de pruebas concluyentes para comunicar una sospecha o preocupación.',
  noProofNeededPublic:
    'No es necesario disponer de pruebas concluyentes para comunicar una sospecha o preocupación.',
  confidentialityCommitment:
    'Tu comunicación será tratada con total confidencialidad por el Delegado de Protección de Menores, sin perjuicio de las obligaciones legales ante las autoridades competentes.',
  confidentialityFormNotice:
    'La identidad de quien comunica será tratada de forma confidencial, sin perjuicio de las obligaciones legales de comunicación a las autoridades competentes.',
  reservedIdentityQuestion:
    '¿Desea mantener reservada su identidad frente a otras personas de la entidad?',
  objectiveDescriptionHint:
    'Se recogerán únicamente los datos necesarios, diferenciando los hechos observados directamente de los relatos o sospechas comunicados por otras personas.',
  documentConfidentialTag: 'DOCUMENTO CONFIDENCIAL – USO INTERNO',
  restrictedAccessBanner:
    'Acceso restringido al Delegado de Protección de Menores. Prohibida la difusión por WhatsApp o canales ordinarios.',
  noClosureOnFirstReport:
    'El registro no se cerrará por el simple hecho de haber realizado una primera comunicación. Se mantendrá el seguimiento mientras existan actuaciones de protección pendientes dentro de las competencias del club.',
  noInternalInterrogations:
    'El club no realizará interrogatorios ni investigaciones que correspondan a profesionales o autoridades competentes.',
  confidentialityWarnings: [
    'Este documento contiene información potencialmente sensible relativa a personas menores de edad. Su acceso estará limitado a las personas que deban intervenir en la protección del menor.',
    'No deberá difundirse por grupos de WhatsApp, correos generales ni canales ordinarios de comunicación del club.',
    'La existencia de este registro no sustituye la obligación de comunicar a las autoridades competentes los hechos que legalmente deban ponerse en su conocimiento.',
    'La atención y protección del menor tendrá siempre prioridad sobre cualquier interés organizativo o deportivo de la entidad.',
  ],
} as const;

export interface LopiviHelpResource {
  id: string;
  name: string;
  phones: Array<{ display: string; href: string }>;
  schedule: string;
  description: string;
  url?: string;
  urgent?: boolean;
}

export const LOPIVI_URGENT_HELP_RESOURCES: LopiviHelpResource[] = [
  {
    id: 'emergencias-112',
    name: 'Emergencias 112',
    phones: [{ display: '112', href: 'tel:112' }],
    schedule: '24 horas · Todos los días',
    description:
      'Si existe peligro inmediato, agresión en curso o una urgencia médica, llama de inmediato al 112.',
    urgent: true,
  },
  {
    id: 'fundacion-anar',
    name: 'Fundación ANAR (Ayuda a Niños, Niñas y Adolescentes)',
    phones: [
      { display: '900 20 20 10', href: 'tel:900202010' },
      { display: '116 111', href: 'tel:116111' },
    ],
    schedule: '24 horas · Gratuito y confidencial',
    description:
      'Orientación psicológica, jurídica y social gratuita y confidencial para menores de edad y adultos que detecten una situación de riesgo.',
    url: 'https://www.anar.org',
  },
  {
    id: 'junta-andalucia-menores',
    name: 'Servicio de Protección de Menores · Junta de Andalucía',
    phones: [{ display: '900 85 18 18', href: 'tel:900851818' }],
    schedule: 'Teléfono de Notificación de Situaciones de Desprotección',
    description:
      'Teléfono gratuito de notificación de posibles situaciones de riesgo o desamparo infantil en Andalucía.',
  },
];

export interface LopiviLegalNorm {
  id: string;
  title: string;
  reference: string;
  scope: 'Estatal' | 'Autonómico (Andalucía)';
  summary: string;
  url: string;
  urlLabel: string;
}

export const LOPIVI_LEGAL_NORMS: LopiviLegalNorm[] = [
  {
    id: 'lo-8-2021',
    title:
      'Ley Orgánica 8/2021, de 4 de junio, de protección integral a la infancia y la adolescencia frente a la violencia (LOPIVI)',
    reference: 'BOE-A-2021-13605 · Ref. BOE núm. 134',
    scope: 'Estatal',
    summary:
      'Establece la obligación de todas las entidades deportivas con menores de implantar protocolos de prevención y actuación, designar Delegado/a de Protección, exigir el certificado negativo de delitos sexuales y habilitar un canal confidencial.',
    url: 'https://www.boe.es/eli/es/lo/2021/06/04/8',
    urlLabel: 'Consultar texto consolidado en el BOE',
  },
  {
    id: 'ley-4-2021-andalucia',
    title:
      'Ley 4/2021, de 27 de julio, de Infancia y Adolescencia de Andalucía',
    reference: 'BOJA núm. 146 · BOE-A-2021-14141',
    scope: 'Autonómico (Andalucía)',
    summary:
      'Regula los derechos, medidas de sensibilización, prevención, detección precoz, coordinación y deber de comunicación ante posibles situaciones de riesgo o desprotección de menores en Andalucía.',
    url: 'https://www.boe.es/eli/es-an/l/2021/07/27/4',
    urlLabel: 'Consultar Ley 4/2021 en el BOE',
  },
  {
    id: 'orden-18-11-2024',
    title:
      'Orden de 18 de noviembre de 2024, por la que se aprueba el Protocolo Marco de Actuación para la Protección de las Personas Menores frente a la Violencia en el Deporte en Andalucía',
    reference: 'BOJA núm. 229 (25/11/2024) · Obligatoria desde el 1 de julio de 2025',
    scope: 'Autonómico (Andalucía)',
    summary:
      'Desarrolla el Protocolo Marco de la Consejería de Cultura y Deporte de la Junta de Andalucía, los anexos de aceptación institucional, designación del Delegado/a, códigos de conducta, autorizaciones de imagen y viajes, y flujograma de comunicación de incidentes.',
    url: 'https://www.juntadeandalucia.es/boja/2024/229/index.html',
    urlLabel: 'Consultar BOJA núm. 229 (Junta de Andalucía)',
  },
  {
    id: 'ley-5-2016-deporte',
    title: 'Ley 5/2016, de 19 de julio, del Deporte de Andalucía',
    reference: 'BOJA núm. 140 · BOE-A-2016-7780',
    scope: 'Autonómico (Andalucía)',
    summary:
      'Marco regulador de la actividad deportiva andaluza, las entidades deportivas, el deporte base, la formación en valores y la seguridad en instalaciones y competiciones.',
    url: 'https://www.boe.es/eli/es-an/l/2016/07/19/5',
    urlLabel: 'Consultar Ley 5/2016 en el BOE',
  },
  {
    id: 'ley-39-2022-deporte',
    title: 'Ley 39/2022, de 30 de diciembre, del Deporte',
    reference: 'BOE-A-2022-24430',
    scope: 'Estatal',
    summary:
      'Refuerza el derecho de las personas menores de edad a la práctica deportiva en entornos seguros, libres de violencia, acoso, abuso o discriminación.',
    url: 'https://www.boe.es/eli/es/l/2022/12/30/39',
    urlLabel: 'Consultar Ley 39/2022 en el BOE',
  },
];

export const LOPIVI_CLUB_OBLIGATIONS = [
  {
    number: '01',
    title: 'Certificado negativo de delitos sexuales',
    description:
      'Exigir a toda persona que trabaje o colabore habitualmente con menores (entrenadores, monitores, voluntarios) el certificado negativo del Registro Central de Delincuentes Sexuales y de Trata de Seres Humanos con carácter previo al inicio de la actividad.',
  },
  {
    number: '02',
    title: 'Protocolo interno de actuación frente a la violencia',
    description:
      'Elaborar, aprobar y aplicar un protocolo interno adaptado al Protocolo Marco de la Junta de Andalucía que regule cómo prevenir, detectar, comunicar y gestionar cualquier situación de riesgo o violencia.',
  },
  {
    number: '03',
    title: 'Formación específica del personal',
    description:
      'Garantizar que las personas que trabajan con menores, de forma remunerada o voluntaria, reciben formación y sensibilización en prevención y detección precoz de la violencia en el deporte.',
  },
  {
    number: '04',
    title: 'Canal de comunicación confidencial',
    description:
      'Habilitar un canal accesible, seguro y confidencial para que deportistas menores, sus familias y el personal del club puedan comunicar sospechas, inquietudes o vulneraciones de derechos.',
  },
  {
    number: '05',
    title: 'Código de conducta y convivencia',
    description:
      'Aprobar y difundir normas claras que regulen las relaciones entre personas adultas, deportistas y familias, incluyendo el uso responsable de imágenes, vestuarios, viajes y comunicaciones digitales.',
  },
  {
    number: '06',
    title: 'Delegado de Protección de Menores',
    description:
      'Designar a una persona de referencia visible para toda la comunidad del club encargada de velar por el cumplimiento de la LOPIVI, atender comunicaciones y activar las medidas de protección.',
  },
] as const;

// ============================================================================
// CATÁLOGOS OFICIALES DEL MODELO DE COMUNICACIÓN Y REGISTRO (doc_1.txt + SQL)
// ============================================================================

export const LOPIVI_CHANNELS: LopiviOptionMeta<LopiviChannel>[] = [
  {
    value: 'CANAL_WEB',
    label: 'Canal Web Confidencial',
    shortLabel: 'Canal Web',
  },
  {
    value: 'PRESENCIAL',
    label: 'Presencial',
    shortLabel: 'Presencial',
  },
  {
    value: 'TELEFONO',
    label: 'Teléfono',
    shortLabel: 'Teléfono',
  },
  {
    value: 'EMAIL',
    label: 'Correo electrónico',
    shortLabel: 'Email',
  },
  {
    value: 'ESCRITO',
    label: 'Comunicación escrita',
    shortLabel: 'Escrito',
  },
  {
    value: 'OTRO',
    label: 'Otra vía',
    shortLabel: 'Otra vía',
  },
];

export const LOPIVI_REPORTER_RELATIONS: string[] = [
  'Deportista',
  'Padre, madre o tutor legal',
  'Entrenador/a',
  'Personal técnico',
  'Directivo/a',
  'Otra',
];

export const LOPIVI_LOCATIONS: string[] = [
  'Entrenamiento',
  'Partido o competición',
  'Vestuario',
  'Desplazamiento',
  'Concentración o viaje',
  'Instalación deportiva',
  'Redes sociales o medios digitales',
  'Otro',
];

export const LOPIVI_SITUATION_TYPES: string[] = [
  'Violencia física',
  'Violencia psicológica o emocional',
  'Acoso entre deportistas',
  'Acoso o abuso sexual',
  'Discriminación',
  'Amenazas o intimidación',
  'Violencia digital',
  'Trato inadecuado',
  'Otra situación de riesgo',
];

export const LOPIVI_IMMEDIATE_RISK_OPTIONS: LopiviOptionMeta<LopiviImmediateRisk>[] = [
  {
    value: 'SI',
    label: 'Sí',
    description: 'Peligro actual o urgencia para la integridad del menor.',
  },
  {
    value: 'NO',
    label: 'No',
    description: 'No se aprecia riesgo físico o peligro inminente en este momento.',
  },
  {
    value: 'NO_DETERMINADO',
    label: 'No se puede determinar',
    description: 'Se desconoce si existe un riesgo inmediato y requiere valoración.',
  },
];

export const LOPIVI_IMMEDIATE_MEASURES: string[] = [
  'Atención y escucha del menor.',
  'Separación preventiva de las personas implicadas cuando resulte necesaria.',
  'Comunicación a la familia, cuando sea seguro y procedente.',
  'Comunicación a servicios de emergencia.',
  'Comunicación a las autoridades competentes.',
  'Derivación a servicios especializados.',
  'Otras medidas',
];

export const LOPIVI_AUTHORITIES: string[] = [
  'Servicios de emergencia (112).',
  'Fuerzas y Cuerpos de Seguridad.',
  'Servicios de protección de menores.',
  'Fiscalía.',
  'Servicios sanitarios.',
  'Servicios sociales.',
  'Otros',
];

export interface LopiviStatusMeta {
  value: LopiviIncidentStatus;
  label: string;
  description: string;
  badgeClass: string;
}

export const LOPIVI_STATUS_META: Record<LopiviIncidentStatus, LopiviStatusMeta> = {
  RECIBIDA: {
    value: 'RECIBIDA',
    label: 'Recibida',
    description: 'Comunicación registrada pendiente de primera valoración del Delegado.',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
  },
  EN_VALORACION: {
    value: 'EN_VALORACION',
    label: 'En valoración',
    description: 'El Delegado de Protección está valorando el riesgo y la procedencia de medidas.',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  },
  MEDIDAS_ADOPTADAS: {
    value: 'MEDIDAS_ADOPTADAS',
    label: 'Medidas adoptadas',
    description: 'Se han aplicado medidas inmediatas de protección dentro del ámbito del club.',
    badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/40',
  },
  DERIVADA_AUTORIDADES: {
    value: 'DERIVADA_AUTORIDADES',
    label: 'Derivada a autoridades',
    description: 'Puesta en conocimiento de los organismos, servicios o autoridades competentes.',
    badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/50',
  },
  EN_SEGUIMIENTO: {
    value: 'EN_SEGUIMIENTO',
    label: 'En seguimiento',
    description: 'Seguimiento activo para prevenir represalias o revictimización del menor.',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/40',
  },
  CERRADA: {
    value: 'CERRADA',
    label: 'Cerrada / Revisada',
    description: 'Actuaciones internas finalizadas tras completar el seguimiento preceptivo.',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  },
};

export const LOPIVI_STATUS_LIST: LopiviStatusMeta[] = [
  LOPIVI_STATUS_META.RECIBIDA,
  LOPIVI_STATUS_META.EN_VALORACION,
  LOPIVI_STATUS_META.MEDIDAS_ADOPTADAS,
  LOPIVI_STATUS_META.DERIVADA_AUTORIDADES,
  LOPIVI_STATUS_META.EN_SEGUIMIENTO,
  LOPIVI_STATUS_META.CERRADA,
];

// ============================================================================
// PROTOCOLO INTERNO FRENTE A LA VIOLENCIA (11 APARTADOS)
// ============================================================================

export interface LopiviSubsection {
  code: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LopiviActionPhase {
  phase: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LopiviProtocolSection {
  number: number;
  title: string;
  introParagraphs?: string[];
  bullets?: string[];
  outroParagraphs?: string[];
  subsections?: LopiviSubsection[];
  phases?: LopiviActionPhase[];
  delegateBlock?: boolean;
}

export const LOPIVI_PROTOCOL_TITLE =
  'PROTOCOLO INTERNO DE PROTECCIÓN DE LAS PERSONAS MENORES FRENTE A LA VIOLENCIA';

export const LOPIVI_PROTOCOL_SECTIONS: LopiviProtocolSection[] = [
  {
    number: 1,
    title: '1. OBJETO DEL PROTOCOLO',
    introParagraphs: [
      'El presente protocolo tiene como finalidad establecer las medidas de prevención, detección, comunicación y actuación frente a cualquier situación de violencia que pueda afectar a las personas menores de edad que participan en las actividades organizadas por el Club Deportivo Voleibol San Pedro.',
      'El club asume el compromiso de garantizar un entorno deportivo seguro, educativo, inclusivo y respetuoso, donde todos los niños, niñas y adolescentes puedan desarrollar su actividad deportiva en condiciones de bienestar físico y emocional.',
      'Este protocolo será de aplicación a todas las personas vinculadas al club, incluyendo directivos, entrenadores, monitores, personal técnico, voluntariado, deportistas, familias y colaboradores.',
    ],
  },
  {
    number: 2,
    title: '2. MARCO NORMATIVO',
    introParagraphs: ['Este documento se desarrolla de acuerdo con:'],
    bullets: [
      'Ley Orgánica 8/2021, de 4 de junio, de protección integral a la infancia y la adolescencia frente a la violencia (LOPIVI).',
      'Ley 4/2021, de 27 de julio, de Infancia y Adolescencia de Andalucía.',
      'Ley 5/2016, de 19 de julio, del Deporte de Andalucía.',
      'Ley 39/2022, de 30 de diciembre, del Deporte.',
      'Orden de 18 de noviembre de 2024, por la que se aprueba el Protocolo Marco de Actuación para la Protección de las Personas Menores frente a la Violencia en el Deporte en Andalucía.',
    ],
    outroParagraphs: [
      'El club adoptará como referencia el Protocolo Marco aprobado por la Junta de Andalucía y sus correspondientes anexos.',
    ],
  },
  {
    number: 3,
    title: '3. COMPROMISO INSTITUCIONAL',
    introParagraphs: [
      'El Club Deportivo Voleibol San Pedro declara su compromiso con la protección integral de los menores y establece como principios fundamentales:',
    ],
    bullets: [
      'Tolerancia cero frente a cualquier forma de violencia.',
      'Respeto a la dignidad e intimidad de los menores.',
      'Igualdad de oportunidades y no discriminación.',
      'Prevención del acoso, abuso, maltrato y cualquier conducta perjudicial.',
      'Protección de la integridad física y emocional.',
      'Participación activa de los menores en su entorno deportivo.',
      'Colaboración con las familias.',
      'Confidencialidad en la gestión de las comunicaciones e incidencias.',
    ],
    outroParagraphs: [
      'La formación deportiva debe ir acompañada de la educación en valores, el respeto, la convivencia y el desarrollo personal.',
    ],
  },
  {
    number: 4,
    title: '4. ÁMBITO DE APLICACIÓN',
    introParagraphs: ['El protocolo será obligatorio en:'],
    bullets: [
      'Entrenamientos y actividades de la escuela de voleibol.',
      'Competiciones y partidos oficiales o amistosos.',
      'Concentraciones y jornadas deportivas.',
      'Desplazamientos y viajes organizados por el club.',
      'Actividades de convivencia y eventos organizados por la entidad.',
      'Instalaciones deportivas y espacios utilizados por el club.',
      'Comunicaciones digitales relacionadas con la actividad deportiva.',
    ],
    outroParagraphs: [
      'También será aplicable a cualquier situación relacionada con la actividad del club que pueda afectar a la seguridad o bienestar de sus deportistas menores.',
    ],
  },
  {
    number: 5,
    title: '5. DELEGADO DE PROTECCIÓN DE MENORES',
    introParagraphs: [
      'El club designa como responsable de protección de menores a:',
    ],
    delegateBlock: true,
    bullets: [
      'Velar por la aplicación y cumplimiento del presente protocolo.',
      'Difundir las normas de protección entre entrenadores, deportistas y familias.',
      'Recibir las comunicaciones de posibles situaciones de violencia o riesgo.',
      'Escuchar y atender las inquietudes de los menores.',
      'Adoptar las primeras medidas de protección que correspondan dentro de las competencias del club.',
      'Coordinar la comunicación con las familias cuando resulte procedente y seguro.',
      'Activar los procedimientos de comunicación ante las autoridades o servicios competentes cuando sea necesario.',
      'Mantener un registro confidencial de las incidencias.',
      'Promover acciones de prevención y formación.',
      'Informar a la Junta Directiva sobre la aplicación del protocolo, respetando la confidencialidad.',
    ],
    outroParagraphs: [
      'Los menores podrán dirigirse directamente al Delegado de Protección o a cualquier persona adulta de confianza del club para comunicar una preocupación.',
    ],
  },
  {
    number: 6,
    title: '6. MEDIDAS DE PREVENCIÓN',
    introParagraphs: ['El club establecerá las siguientes medidas preventivas:'],
    subsections: [
      {
        code: '6.1',
        title: '6.1. Personal técnico',
        bullets: [
          'Todo el personal deberá conocer y aceptar el código de conducta del club.',
          'Se comprobará que las personas que deban trabajar habitualmente con menores cumplen los requisitos legales de acceso a dichas actividades, incluida la acreditación negativa del Registro Central de Delincuentes Sexuales y de Trata de Seres Humanos cuando corresponda.',
          'Se promoverá la formación en prevención y detección de situaciones de violencia.',
          'Se fomentará una relación educativa basada en el respeto y la confianza.',
        ],
      },
      {
        code: '6.2',
        title: '6.2. Entrenamientos',
        bullets: [
          'Los entrenamientos se desarrollarán en espacios seguros y adecuados.',
          'Se evitarán situaciones innecesarias de aislamiento entre un adulto y un menor.',
          'Se respetarán los horarios y las normas de funcionamiento de las instalaciones.',
          'Se evitarán castigos físicos, humillaciones o cualquier forma de intimidación.',
          'Se garantizará un trato respetuoso entre compañeros.',
        ],
      },
      {
        code: '6.3',
        title: '6.3. Vestuarios',
        bullets: [
          'Se respetará siempre la intimidad de los menores.',
          'No se permitirá realizar fotografías ni grabaciones.',
          'Se evitará la presencia innecesaria de adultos.',
          'Cualquier intervención por motivos de seguridad deberá estar justificada y realizarse con las máximas garantías posibles.',
        ],
      },
      {
        code: '6.4',
        title: '6.4. Competiciones y desplazamientos',
        bullets: [
          'Las familias recibirán información sobre las actividades y desplazamientos.',
          'Se establecerán responsables de supervisión.',
          'Se evitarán situaciones de aislamiento entre adultos y menores.',
          'Los viajes y desplazamientos contarán con las autorizaciones familiares correspondientes.',
          'Se establecerán normas de convivencia y alojamiento adecuadas a la edad de los participantes.',
        ],
      },
      {
        code: '6.5',
        title: '6.5. Comunicaciones e imágenes',
        bullets: [
          'Las comunicaciones se realizarán preferentemente mediante canales oficiales del club y grupos organizativos.',
          'Se evitarán comunicaciones privadas inadecuadas entre adultos y menores.',
          'Las fotografías y vídeos se utilizarán conforme a las autorizaciones y normativa de protección de datos.',
          'No se permitirá compartir imágenes de menores en contextos que puedan perjudicar su intimidad o dignidad.',
        ],
      },
    ],
  },
  {
    number: 7,
    title: '7. IDENTIFICACIÓN DE SITUACIONES DE VIOLENCIA',
    introParagraphs: ['Se considerarán situaciones que requieren atención, entre otras:'],
    bullets: [
      'Violencia física.',
      'Violencia psicológica o emocional.',
      'Insultos, amenazas, humillaciones o intimidaciones.',
      'Acoso entre deportistas.',
      'Abuso o acoso sexual.',
      'Discriminación por sexo, discapacidad, origen, religión o cualquier otra circunstancia personal o social.',
      'Exclusión deliberada o aislamiento.',
      'Maltrato por parte de personas adultas.',
      'Violencia digital y difusión de contenidos perjudiciales.',
      'Cualquier conducta que pueda poner en peligro la integridad o el bienestar de un menor.',
    ],
  },
  {
    number: 8,
    title: '8. PROCEDIMIENTO DE COMUNICACIÓN Y ACTUACIÓN',
    introParagraphs: [
      'Cualquier persona vinculada al club que conozca o sospeche una posible situación de violencia deberá comunicarla al Delegado de Protección.',
      'El procedimiento será el siguiente:',
    ],
    phases: [
      {
        phase: 'Fase 1',
        title: 'Primera fase: recepción de la comunicación',
        paragraphs: [
          'El Delegado de Protección recibirá la información directamente, por teléfono, correo electrónico o mediante el modelo interno de comunicación de incidencias.',
        ],
      },
      {
        phase: 'Fase 2',
        title: 'Segunda fase: atención y protección',
        paragraphs: [
          'Se atenderá prioritariamente la seguridad del menor, evitando su exposición a nuevas situaciones de riesgo.',
          'Si existe peligro inmediato o una urgencia médica, se contactará con los servicios de emergencia a través del 112.',
        ],
      },
      {
        phase: 'Fase 3',
        title: 'Tercera fase: registro',
        paragraphs: ['Se documentará la incidencia indicando, en la medida de lo posible:'],
        bullets: [
          'Fecha y lugar.',
          'Personas implicadas.',
          'Descripción objetiva de los hechos.',
          'Medidas de protección adoptadas.',
          'Personas o servicios a los que se ha comunicado.',
        ],
      },
      {
        phase: 'Fase 4',
        title: 'Cuarta fase: comunicación',
        paragraphs: [
          'Cuando los hechos puedan constituir una situación de violencia, se activarán los canales de comunicación y derivación previstos en el Protocolo Marco andaluz y se trasladará la información a los servicios o autoridades competentes.',
          'Cuando exista sospecha de delito o riesgo grave, no se retrasará la comunicación a las autoridades para realizar comprobaciones internas.',
        ],
      },
      {
        phase: 'Fase 5',
        title: 'Quinta fase: seguimiento',
        paragraphs: [
          'El Delegado de Protección realizará el seguimiento de las medidas adoptadas y velará por que el menor no sufra represalias, exposición innecesaria o revictimización.',
          'El club no realizará interrogatorios ni investigaciones que correspondan a profesionales o autoridades competentes.',
        ],
      },
    ],
  },
  {
    number: 9,
    title: '9. CONFIDENCIALIDAD Y PROTECCIÓN DE DATOS',
    introParagraphs: [
      'Toda la información relacionada con posibles situaciones de violencia tendrá carácter confidencial.',
      'El club garantizará:',
    ],
    bullets: [
      'Acceso restringido a la documentación.',
      'Custodia segura de los registros.',
      'Tratamiento de datos limitado a las finalidades de protección.',
      'Respeto a la intimidad de los menores y sus familias.',
      'Prohibición de divulgar información o rumores sobre los hechos.',
    ],
    outroParagraphs: [
      'La información solo se compartirá con las personas o autoridades que deban intervenir.',
    ],
  },
  {
    number: 10,
    title: '10. PARTICIPACIÓN DE LAS FAMILIAS',
    introParagraphs: [
      'El club considera fundamental la colaboración de las familias en la construcción de un entorno deportivo seguro.',
      'Las familias deberán:',
    ],
    bullets: [
      'Conocer y respetar el presente protocolo.',
      'Fomentar el respeto hacia todos los participantes.',
      'Comunicar cualquier situación preocupante.',
      'Respetar las normas de convivencia.',
      'Colaborar con las medidas de protección adoptadas por el club.',
    ],
    outroParagraphs: [
      'El club facilitará información sobre los canales de comunicación disponibles.',
    ],
  },
  {
    number: 11,
    title: '11. SEGUIMIENTO Y REVISIÓN',
    introParagraphs: [
      'El Delegado de Protección supervisará la aplicación del protocolo y propondrá las mejoras necesarias.',
      'El documento será revisado:',
    ],
    bullets: [
      'Al inicio de cada temporada deportiva.',
      'Cuando se produzcan cambios normativos.',
      'Cuando se detecten deficiencias en su aplicación.',
      'Cuando se produzca una incidencia que aconseje modificar los procedimientos.',
    ],
    outroParagraphs: [
      'La Junta Directiva conocerá y aprobará las actualizaciones que correspondan.',
    ],
  },
];

// ============================================================================
// CÓDIGO DE CONDUCTA Y CONVIVENCIA PARA FAMILIAS Y DEPORTISTAS (8 APARTADOS)
// ============================================================================

export interface LopiviConductSection {
  number: number;
  title: string;
  introParagraphs?: string[];
  bullets?: string[];
  outroParagraphs?: string[];
  delegateBlock?: boolean;
}

export const LOPIVI_CONDUCT_CODE_TITLE =
  'CÓDIGO DE CONDUCTA Y CONVIVENCIA PARA FAMILIAS Y DEPORTISTAS';

export const LOPIVI_CONDUCT_CODE_SECTIONS: LopiviConductSection[] = [
  {
    number: 1,
    title: '1. OBJETO',
    introParagraphs: [
      'El presente código tiene como finalidad establecer unas normas básicas de convivencia, respeto y buen trato para todos los deportistas, familias y tutores legales que participan en las actividades organizadas por el Club Deportivo Voleibol San Pedro.',
      'El club entiende el deporte como una herramienta de formación personal y educativa. Por ello, la participación en sus actividades implica el compromiso de respetar a los compañeros, entrenadores, árbitros, rivales, familias y demás personas vinculadas a la entidad.',
      'Queremos construir un entorno deportivo donde nuestros jugadores y jugadoras puedan aprender, disfrutar, competir y crecer como personas.',
    ],
  },
  {
    number: 2,
    title: '2. COMPROMISO DEL CLUB',
    introParagraphs: ['El Club Deportivo Voleibol San Pedro se compromete a:'],
    bullets: [
      'Promover un deporte seguro, educativo e inclusivo.',
      'Proteger la integridad física y emocional de los menores.',
      'Prevenir cualquier forma de violencia, acoso o discriminación.',
      'Disponer de un Delegado de Protección de Menores.',
      'Atender las comunicaciones e incidencias que puedan afectar a los deportistas.',
      'Fomentar la participación y colaboración de las familias.',
      'Promover valores como el respeto, el compañerismo, la responsabilidad y el esfuerzo.',
      'Garantizar que los menores puedan comunicar sus preocupaciones sin miedo a represalias.',
    ],
  },
  {
    number: 3,
    title: '3. NORMAS PARA LOS DEPORTISTAS',
    introParagraphs: ['Todos los jugadores y jugadoras deberán:'],
    bullets: [
      'Respetar a sus compañeros y compañeras, entrenadores, árbitros y rivales.',
      'Utilizar un lenguaje adecuado y evitar insultos, burlas y amenazas.',
      'Cuidar el material deportivo y las instalaciones.',
      'Respetar las normas de los entrenamientos y competiciones.',
      'Aceptar las decisiones técnicas y arbitrales con deportividad.',
      'Evitar cualquier conducta de acoso, humillación o exclusión.',
      'No discriminar a ningún compañero por sus circunstancias personales.',
      'No grabar ni difundir imágenes de otros deportistas sin autorización.',
      'Comunicar a un adulto de confianza cualquier situación incómoda, injusta o violenta.',
      'Ayudar a mantener un ambiente positivo dentro y fuera de la pista.',
    ],
  },
  {
    number: 4,
    title: '4. NORMAS PARA LAS FAMILIAS',
    introParagraphs: [
      'Las familias y tutores legales son una parte fundamental del proyecto deportivo y educativo del club.',
      'Por ello, deberán:',
    ],
    bullets: [
      'Fomentar el respeto hacia entrenadores, deportistas, árbitros y otras familias.',
      'Apoyar a sus hijos e hijas sin generar presiones excesivas.',
      'Evitar insultos, amenazas o humillaciones hacia cualquier participante.',
      'Respetar las decisiones técnicas y organizativas de los entrenadores.',
      'Utilizar los canales adecuados para trasladar consultas, desacuerdos o incidencias.',
      'Colaborar con el club en la protección y bienestar de los menores.',
      'Respetar la intimidad de otros deportistas y familias.',
      'No difundir imágenes de menores ajenos sin la correspondiente autorización.',
      'Mantener una actitud constructiva durante entrenamientos y competiciones.',
      'Informar al club de cualquier circunstancia relevante para la seguridad o bienestar del menor.',
      'Respetar las normas de acceso y permanencia en las instalaciones deportivas.',
    ],
    outroParagraphs: [
      'Las diferencias de opinión deberán tratarse de manera respetuosa y mediante los canales establecidos por el club, evitando conflictos delante de los menores.',
    ],
  },
  {
    number: 5,
    title: '5. CONDUCTAS NO PERMITIDAS',
    introParagraphs: ['No se permitirá:'],
    bullets: [
      'Insultar, amenazar o agredir a cualquier persona.',
      'Ridiculizar a un menor por su rendimiento deportivo.',
      'Discriminar por sexo, discapacidad, origen, religión o cualquier otra circunstancia personal.',
      'Difundir rumores, comentarios ofensivos o imágenes inapropiadas.',
      'Presionar a los menores de forma perjudicial.',
      'Invadir vestuarios o espacios reservados sin autorización.',
      'Generar conflictos o enfrentamientos en presencia de menores.',
      'Fomentar situaciones de acoso o exclusión.',
      'Ocultar situaciones de riesgo o violencia.',
      'Realizar grabaciones que vulneren la intimidad de los participantes.',
    ],
  },
  {
    number: 6,
    title: '6. USO DE IMÁGENES Y REDES SOCIALES',
    introParagraphs: [
      'Las familias y deportistas deberán respetar la normativa y las autorizaciones relativas al uso de imágenes de menores.',
      'Las fotografías y vídeos realizados durante entrenamientos, partidos y actividades deberán utilizarse de forma responsable.',
      'No se permitirá:',
    ],
    bullets: [
      'Publicar imágenes de menores sin la correspondiente legitimación o autorización.',
      'Difundir fotografías tomadas en vestuarios o espacios privados.',
      'Compartir imágenes que puedan perjudicar la dignidad o intimidad de un deportista.',
      'Utilizar redes sociales para insultar, acosar o desprestigiar a compañeros, entrenadores o miembros del club.',
    ],
  },
  {
    number: 7,
    title: '7. COMUNICACIÓN DE INCIDENCIAS',
    introParagraphs: [
      'Cualquier deportista, familiar o tutor legal podrá comunicar una situación de preocupación, riesgo, violencia, acoso o trato inadecuado.',
      'El contacto podrá realizarse directamente con el Delegado de Protección de Menores:',
    ],
    delegateBlock: true,
    outroParagraphs: [
      'El club se compromete a tratar las comunicaciones con confidencialidad, prudencia y responsabilidad, priorizando siempre la protección del menor.',
      'No será necesario disponer de pruebas concluyentes para comunicar una sospecha o preocupación.',
    ],
  },
  {
    number: 8,
    title: '8. COLABORACIÓN Y RESPONSABILIDAD',
    introParagraphs: [
      'La protección de los menores es una responsabilidad compartida.',
      'El club, las familias y los deportistas deberán colaborar para conseguir un entorno deportivo seguro, donde prevalezcan el respeto, la educación y el compañerismo.',
      'El incumplimiento de estas normas podrá dar lugar a la aplicación de las medidas organizativas o disciplinarias previstas en las normas internas del club y en la legislación vigente, respetando siempre los derechos de las personas implicadas.',
    ],
  },
];

// ============================================================================
// TEXTOS LITERALES DEL MODELO OFICIAL DE COMUNICACIÓN Y REGISTRO (doc_1.txt)
// ============================================================================

export const LOPIVI_INCIDENT_MODEL_TITLE =
  'MODELO DE COMUNICACIÓN Y REGISTRO DE INCIDENCIAS RELACIONADAS CON LA PROTECCIÓN DE MENORES';

export const LOPIVI_INCIDENT_MODEL_FINALIDAD = [
  'El presente documento tiene como finalidad facilitar la comunicación, recepción y registro de posibles situaciones de violencia, acoso, maltrato, discriminación o cualquier circunstancia que pueda comprometer la seguridad y el bienestar de las personas menores que participan en las actividades del Club Deportivo Voleibol San Pedro.',
  'Podrá utilizarse por deportistas, familias, entrenadores, personal técnico, colaboradores o cualquier persona que tenga conocimiento de una situación preocupante.',
  'No será necesario disponer de pruebas concluyentes para comunicar una sospecha o preocupación.',
];
