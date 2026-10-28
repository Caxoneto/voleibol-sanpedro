import {
  Category,
  Team,
  Player,
  Staff,
  Match,
  Standings,
  Article,
  SponsorTier,
  CurrentSponsor,
  SponsorInquiry,
  FanVote,
  Chant,
  WallpaperDownload,
  PressAccreditation,
  NewsletterSubscriber,
  ClubInfo,
} from './types';

export const CLUB_INFO: ClubInfo = {
  name: 'C.D. Voleibol San Pedro',
  shortName: 'CDV San Pedro',
  federationRegisteredName: 'SAN PEDRO C.D VOLEIBOL',
  cif: 'G93147924',
  president: 'Alberto Alcántara González',
  officialAddress: 'C/ Diego Piña Macias Nº 21, 29670 San Pedro Alcántara (Málaga)',
  postalCode: '29670',
  city: 'San Pedro Alcántara',
  province: 'Málaga',
  region: 'Málaga, Andalucía',
  venueName: 'Pabellón Polideportivo Sergio Scariolo',
  venueAddress: 'Diseminado Ensanche Sur I, 16S, 29670 Marbella, Málaga',
  venueMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Pabell%C3%B3n+Polideportivo+Sergio+Scariolo,+Diseminado+Ensanche+Sur+I,+16S,+29670+Marbella,+M%C3%A1laga',
  federationName: 'Federación Andaluza de Voleibol (FAVB)',
  federationUrl: 'https://favoley.net/publico/index.php',
  contactEmail: 'voleibolsanpedro@hotmail.es',
  contactPhone: '+34 657 71 37 71',
  whatsappUrl: 'https://wa.me/34657713771?text=Hola%2C%20me%20gustar%C3%ADa%20informaci%C3%B3n%20sobre%20el%20C.D.%20Voleibol%20San%20Pedro',
  instagramUrl: 'https://www.instagram.com/voleibolsanpedro/',
  facebookUrl: 'https://www.facebook.com/CDVoleibolSanPedro/',
  socialHashtag: '#VoleibolSanPedro',
  motto: 'Pasión, cantera y orgullo sampedreño',
};

import {
  FAVB_CATEGORIES,
  FAVB_TEAMS,
  FAVB_PLAYERS,
  FAVB_STAFF,
  FAVB_MATCHES,
  FAVB_STANDINGS,
} from './favb-data';

import {
  AFADE_CATEGORIES,
  AFADE_TEAMS,
  AFADE_PLAYERS,
  AFADE_STAFF,
  AFADE_MATCHES,
  AFADE_STANDINGS,
} from './afade-data';

export const INITIAL_CATEGORIES: Category[] = [...FAVB_CATEGORIES, ...AFADE_CATEGORIES];
export const INITIAL_TEAMS: Team[] = [...FAVB_TEAMS, ...AFADE_TEAMS];
export const INITIAL_PLAYERS: Player[] = [...FAVB_PLAYERS, ...AFADE_PLAYERS];
export const INITIAL_STAFF: Staff[] = [...FAVB_STAFF, ...AFADE_STAFF];
export const INITIAL_MATCHES: Match[] = [...FAVB_MATCHES, ...AFADE_MATCHES];
export const INITIAL_STANDINGS: Standings[] = [...FAVB_STANDINGS, ...AFADE_STANDINGS];

export const INITIAL_ARTICLES: Article[] = [
  {
    id: 'art-resultados-primeras-jornadas-26-27',
    title: 'Resultados de las Primeras Jornadas: Victorias de Cantera y Estreno Competitivo en las Ligas FAVB 26/27',
    slug: 'resultados-primeras-jornadas-ligas-favb-26-27',
    excerpt: 'Repaso completo a los marcadores oficiales de todas nuestras categorías en el arranque de la temporada 2026/2027, destacando los triunfos por 3-0 de Infantil Masculino, Infantil Femenino Rojo y Cadete Femenino Rojo, junto a los tie-breaks disputados por Senior Femenino e Infantil Femenino Negro.',
    contentMarkdown: `Las competiciones oficiales de la Federación Andaluza de Voleibol (FAVB) ya están en plena marcha para los equipos del **C.D. Voleibol San Pedro** en esta temporada 2026/2027. Las primeras jornadas ligueras han dejado grandes momentos en el Pabellón Polideportivo Sergio Scariolo y en las pistas de toda la provincia, con importantes victorias en nuestras categorías de cantera y partidos decididos en el quinto set.

A continuación repasamos el balance y los resultados oficiales registrados en cada una de las categorías del club en este arranque de liga:

### Senior Femenino (1ª División Andaluza)

Nuestro primer equipo femenino compite en el exigente Grupo B de Primera División Andaluza, sumando ya su primer punto en casa tras un intenso duelo a cinco sets ante CDU Atarfe:

- **Jornada 1:** ACADEMIA VC ISONDA **3 - 0** VOLEIBOL SAN PEDRO (25-15, 25-14, 25-19)
- **Jornada 2:** VOLEIBOL SAN PEDRO **2 - 3** CDU ATARFE 1AF (25-22, 26-24, 22-25, 15-25, 11-15) — Primer punto oficial sumado en el Pabellón Sergio Scariolo tras adelantarse 2-0 en un vibrante encuentro.
- **Jornada 3:** CV CIUDAD DE MÁLAGA **3 - 0** VOLEIBOL SAN PEDRO (25-17, 25-17, 25-16)

### Cadete Femenino Rojo

Gran reacción del conjunto Cadete Femenino Rojo, que tras un debut muy igualado en casa logró su primera victoria a domicilio por la vía rápida en la segunda jornada:

- **Jornada 1:** VOLEIBOL SAN PEDRO ROJO **0 - 3** CV PIZARRA LA FUENSANTA (20-25, 23-25, 21-25)
- **Jornada 2:** NUEVA OLA A **0 - 3** VOLEIBOL SAN PEDRO ROJO (10-25, 14-25, 14-25) — Victoria contundente a domicilio sumando los 3 primeros puntos en la tabla.

### Infantil Masculino

Estreno con triunfo a domicilio para nuestros chicos del Infantil Masculino en la jornada inaugural de la competición provincial:

- **Jornada 1:** 3STEVOLEY **0 - 3** VOLEIBOL SAN PEDRO (17-25, 21-25, 21-25) — Primera victoria oficial de la temporada sin ceder un solo set en Estepona.
- **Jornada 2:** VOLEIBOL SAN PEDRO **0 - 3** ALHAURÍN DE LA TORRE (8-25, 12-25, 7-25)

### Infantil Femenino Rojo

Nuestro equipo Infantil Femenino Rojo firmó una actuación sobresaliente en su estreno como local en el Sergio Scariolo durante la segunda jornada:

- **Jornada 1:** COSTA DEL VOLEY ROSA (ORO) **3 - 0** VOLEIBOL SAN PEDRO ROJO (25-19, 25-19, 25-16)
- **Jornada 2:** VOLEIBOL SAN PEDRO ROJO **3 - 0** FORVOLEY TORREMOLINOS (25-3, 25-8, 25-18) — Triunfo autoritario en casa para sumar los 3 primeros puntos ligueros.

### Infantil Femenino Negro

Progresión competitiva inmediata del bloque Infantil Femenino Negro, que en su segunda salida forzó el tie-break en Benalmádena para estrenar su casillero de puntos:

- **Jornada 1:** VOLEIBOL SAN PEDRO NEGRO **0 - 3** FUENGIROLA CV A (10-25, 14-25, 15-25)
- **Jornada 2:** UDA BENALMADENA A **3 - 2** VOLEIBOL SAN PEDRO NEGRO (25-23, 15-25, 25-20, 13-25, 15-10) — Punto de mérito a domicilio en un encuentro disputado de principio a fin.

### Juvenil Masculino y Juvenil Femenino Rojo

Nuestros conjuntos juveniles han afrontado un calendario inicial de máxima exigencia ante rivales de la parte alta de la clasificación:

- **Juvenil Masculino (J1):** VOLEIBOL SAN PEDRO **1 - 3** FUENGIROLA CV A (12-25, 22-25, 25-19, 22-25)
- **Juvenil Masculino (J2):** UDA BENALMADENA **3 - 0** VOLEIBOL SAN PEDRO (25-12, 25-13, 25-19)
- **Juvenil Femenino Rojo (J1):** CARTAMA AZUL **3 - 0** VOLEIBOL SAN PEDRO ROJO (25-3, 25-10, 25-16)
- **Juvenil Femenino Rojo (J2):** VOLEIBOL SAN PEDRO ROJO **0 - 3** COSTA DEL VOLEY ROSA (21-25, 23-25, 20-25)
- **Juvenil Femenino Rojo (J3):** INTER PLAYAS A **3 - 0** VOLEIBOL SAN PEDRO ROJO (25-14, 25-23, 26-24)

### Debut del resto de categorías federadas

Completan la puesta en marcha de nuestras once categorías los estrenos de **Cadete Masculino** (ante 3stevoley), **Infantil Femenino Blanco** (frente a Fuengirola CV B), **Júnior Masculino** y **Senior Masculino**, cuyas actas, marcadores en directo y clasificaciones pueden seguirse jornada a jornada desde nuestra web oficial.`,
    categoryId: 'cat-competicion',
    categoryName: 'Competición y Resultados',
    coverImageUrl: '/images/pabellon-sergio-scariolo.jpg',
    publishedAt: '2026-10-18T08:00:00.000Z',
    isFeatured: true,
    readingTimeMinutes: 3,
  },
  {
    id: 'art-loteria-2026',
    title: 'Lotería de Navidad 2026: Juega con el C.D. Voleibol San Pedro al número 15.586 y apoya al club',
    slug: 'loteria-navidad-2026-voleibol-san-pedro-15586',
    excerpt: 'Desde el club se ponen a la venta los décimos de la tradicional Lotería Nacional de Navidad (22 de diciembre de 2026) al número 15.586 por 23 €, con donativo de apoyo a nuestra cantera.',
    contentMarkdown: `El C.D. Voleibol San Pedro pone a la venta los décimos de la tradicional Lotería Nacional de Navidad para el sorteo extraordinario del próximo **22 de diciembre de 2026**.

Compartir este número es una de las tradiciones de nuestras familias, socios, jugadores y aficionados. Con cada décimo adquirido estás colaborando de forma directa y decisiva con el club y el proyecto formativo de nuestra cantera en San Pedro Alcántara.

### 15.586

### Datos del Décimo Oficial

- **Número jugado:** **15.586**
- **Fecha del sorteo:** 22 de diciembre de 2026 (S.E. Loterías y Apuestas del Estado).
- **Precio por décimo:** **23 €** (incluye donativo de apoyo al club).

### ¿Cómo adquirir tu décimo?

1. **En el Pabellón Polideportivo Sergio Scariolo:** Preguntando directamente a los entrenadores durante los entrenamientos semanales de cantera y del primer equipo (únicamente pago en efectivo).

¡Muchas gracias por apoyar al club y mucha suerte a todos con el **15.586**!`,
    categoryId: 'cat-club',
    categoryName: 'Club e Institucional',
    coverImageUrl: '/images/noticias/loteria-navidad-2026.png',
    publishedAt: '2026-10-06T19:00:00.000Z',
    isFeatured: true,
    readingTimeMinutes: 2,
  },
  {
    id: 'art-reglas-2026',
    title: 'Nuevas Reglas de Juego 2026: Cambios Oficiales de la RFEVB y la FAVB para la Temporada 26/27',
    slug: 'nuevas-reglas-juego-temporada-2026-rfevb-favb',
    excerpt: 'El Comité Técnico Nacional de Árbitros (CTNA) y la Federación Andaluza de Voleibol anuncian las modificaciones clave: ampliación a 8 sustituciones, criterio de balón al techo, protocolo de saque y aclaraciones en ataque.',
    contentMarkdown: `El Comité Técnico Nacional de Árbitros (CTNA) de la Real Federación Española de Voleibol (RFEVB), en coordinación con la Federación Andaluza de Voleibol (FAVB) y su iniciativa formativa ESVÓLEY, ha publicado la circular técnica oficial con los cambios y clarificaciones a las Reglas Oficiales del Juego para la Temporada 2026/2027.

Estas novedades reglamentarias son de aplicación inmediata en todas las competiciones federadas en las que participa el C.D. Voleibol San Pedro, tanto en categoría Senior como en las categorías de cantera (Júnior, Juvenil, Cadete e Infantil).

A continuación desglosamos los puntos esenciales que deben conocer técnicos, jugadores, delegados y aficionados:

### 1. Número de sustituciones por set: Aumento de 6 a 8 (Regla 15.1)

Se amplía la flexibilidad táctica en pista para entrenadores y plantillas:

- Cada equipo puede solicitar un máximo de dos (2) tiempos de descanso y **ocho (8) sustituciones oficiales por set** (frente a las 6 permitidas en temporadas anteriores).
- **Aclaración federativa sobre rotación:** ¿Puede un jugador entrar y salir varias veces o rotar indefinidamente? No. Las limitaciones individuales del reglamento siguen vigentes sin cambios: un jugador de la formación inicial solo puede ser sustituido una vez por set y únicamente puede volver a la pista en sustitución del mismo jugador que lo reemplazó (ocupando su misma posición original en la rotación). El único cambio introducido es el cupo global acumulado del equipo, que asciende de 6 a 8 sustituciones.

### 2. Balón que contacta con la infraestructura del techo

Se introduce una modificación fundamental sobre la continuidad del rally en pabellones cubiertos:

- Si tras el primer o segundo toque de un equipo el balón toca cualquier elemento de la infraestructura del techo (vigas, cables, focos de iluminación o videomarcador) y **permanece jugable dentro del propio lado de la pista** (no cruza la red hacia el campo rival), la jugada continúa permitiéndose un segundo o tercer toque del mismo equipo.
- Si tras contactar con el techo el balón pasa al campo adversario, se considera falta inmediata y el equipo pierde el punto.
- Se define formalmente como «techo» tanto la propia superficie superior del pabellón como cualquier estructura o elemento suspendido de ella.

### 3. Protocolo de calentamiento de saque separado

Para optimizar los tiempos previos al partido y maximizar la seguridad en la zona de servicio:

- Se asignan **90 segundos cronometrados exclusivos para cada equipo** para el calentamiento de saques en red (-3:00 para Equipo A y -1:30 para Equipo B).
- Mientras un equipo realiza su calentamiento de saque, **el equipo rival debe abandonar obligatoriamente la pista y la zona libre**, manteniéndose fuera del terreno de juego (por ejemplo, en la zona de su banquillo) sin estar autorizado a calentar con balones.
- Cada equipo puede utilizar la totalidad de la pista para ensayar sus servicios y es responsable de recoger sus balones con el apoyo de los recogepelotas auxiliares.

### 4. Doble golpe en el pase de dedos entre compañeros (Regla 9.3.4)

Se mantiene la directriz de dinamizar el juego: cuando se produce un pase de colocación entre compañeros de equipo mediante toque de dedos, **están permitidos los contactos consecutivos con el balón en las manos siempre y cuando tengan lugar durante la misma acción técnica continuada**.

### 5. Balón llevado en ataque: Criterio estricto de Tip / Finta (Regla 9.2.2)

El comité arbitral subraya la aplicación rigurosa de la Regla 9.2.2 para evitar ventajas ilícitas en las fintas sobre la red:

- Queda terminantemente prohibido «empujar, levantar, atrapar o lanzar» el balón en jugadas de ataque.
- La finta o toque técnico («tip») **debe ejecutarse con UNA SOLA MANO**.
- El contacto con el balón debe tener un **TIEMPO DE CONTACTO EXTREMADAMENTE CORTO** (toque limpio y seco).
- El toque debe dirigirse en **LÍNEA RECTA**, no permitiéndose cambios de trayectoria en el aire.
- Quedan sancionadas las acciones de finta con dos manos, los empujes hacia el bloqueo rival y los llamados «blockouts» con la mano abierta. Solo se admite el toque de balón con contacto muy breve.

### 6. Falta de posición del equipo en recepción (Regla 7.4 - Interpretación 2026)

Se unifica el criterio arbitral sobre el momento exacto en que los receptores pueden moverse tácticamente:

- El silbato del primer árbitro autoriza la orden de servicio, pero **es el inicio de la acción del movimiento de saque** (un paso hacia adelante, el lanzamiento del balón al aire o cualquier movimiento visible de brazos o piernas vinculado al acto de sacar) el hito reglamentario que permite a los jugadores del equipo receptor abandonar su posición inicial de rotación.
- Gestos preparatorios como botar el balón en el suelo o realizar inspiraciones profundas antes de iniciar el armado no se consideran el inicio de la acción de saque.
- En el instante exacto en que el balón es impactado por el sacador, cada equipo al completo debe encontrarse ubicado dentro de su propio campo reglamentario (con excepción del sacador).

### Documentación y verificación oficial

Puedes contrastar la presentación completa y consultar la circular original de la Federación Andaluza de Voleibol en el siguiente enlace oficial:

[Consultar presentación oficial de Cambios de Reglas 2026 en FAVB](https://165e8224379cb79cb563c792a0d46c7c.eu.r2.cloudflarestorage.com/favoley/portal/secciones/45/descargas/descarga_c44937ea001aa6df8115.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=3b22886a3aec6e3bb36a6af2d431a630%2F20261006%2Fauto%2Fs3%2Faws4_request&X-Amz-Date=20261006T233124Z&X-Amz-Expires=900&X-Amz-SignedHeaders=host&response-content-disposition=inline%3B%20filename%3D%22CAMBIOS%20DE%20REGLAS%202026_RFEVB_CTNA%20pptx.pdf%22&X-Amz-Signature=b5d6b3ce4733dcc66ea4de46b583e69ccfc2f42922fd22e63e217dd1a5d4fb2b)

Asimismo, los clubes, jugadores y técnicos pueden descargar la copia íntegra del documento archivada en el servidor del C.D. Voleibol San Pedro:

[Descargar PDF oficial de Cambios de Reglas 2026](/docs/cambios-de-reglas-2026-rfevb.pdf)`,
    categoryId: 'cat-inst',
    categoryName: 'Normativa y FAVB',
    coverImageUrl: '/images/noticias/nuevas-reglas-2026.png',
    publishedAt: '2026-10-06T18:00:00.000Z',
    isFeatured: true,
    readingTimeMinutes: 4,
  },
];

export const INITIAL_SPONSOR_TIERS: SponsorTier[] = [
  {
    id: 'sp-1',
    name: 'Empresa Colaboradora',
    priceAnnual: '300€',
    description: '',
    features: [
      'Bienvenida en redes',
      'Presencia en el listado de colaboradores',
    ],
    isFeatured: false,
  },
  {
    id: 'sp-2',
    name: 'Patrocinador Local',
    priceAnnual: '600€',
    description: '',
    features: [
      'Ventajas anteriores',
      'Presencia en soportes colectivos del club',
      'Menciones periódicas',
    ],
    isFeatured: false,
  },
  {
    id: 'sp-3',
    name: 'Patrocinador Oficial',
    priceAnnual: '1.200€',
    description: '',
    features: [
      'Ventajas anteriores',
      'Banner en pista',
      'Logotipo en camiseta de entrenamiento',
      'Contenido específico',
    ],
    isFeatured: false,
  },
  {
    id: 'sp-4',
    name: 'Patrocinador Principal',
    priceAnnual: 'desde 2.500€',
    description: '',
    features: [
      'Presencia destacada',
      'Acciones personalizadas',
      'Protagonismo en eventos',
    ],
    isFeatured: true,
  },
];

export const CURRENT_SPONSORS: CurrentSponsor[] = [
  {
    id: 'sponsor-inch',
    name: 'INCH',
    tagline: 'Thai Noodles • Ramen • Sushi',
    logoUrl: '/images/sponsors/inch.png',
    url: 'https://inchbar.es/inch-san-pedro/',
    bgClass: 'bg-white',
  },
  {
    id: 'sponsor-biscottino',
    name: 'Heladería Biscottino',
    tagline: 'Elaboración artesanal diaria y a la vista',
    logoUrl: '/images/sponsors/heladeria-biscottino.png',
    url: 'https://www.instagram.com/heladeriabiscottino1y2/',
    bgClass: 'bg-white',
  },
  {
    id: 'sponsor-pimentel',
    name: 'Pimentel Artes Gráficas',
    tagline: 'Artes Gráficas',
    logoUrl: '/images/sponsors/pimentel-artes-graficas.png',
    url: 'https://pimentel.es/',
    bgClass: 'bg-white',
  },
  {
    id: 'sponsor-gaucho',
    name: 'Grupo Gaucho',
    tagline: '',
    logoUrl: '/images/sponsors/grupo-gaucho.png',
    url: 'https://grupogaucho.es/',
    bgClass: 'bg-[#0b0a09]',
  },
  {
    id: 'sponsor-morales',
    name: 'Morales Obra Civil',
    tagline: '952 78 19 33',
    logoUrl: '/images/sponsors/morales-obra-civil.png',
    url: 'https://www.valledelsol.org/',
    bgClass: 'bg-white',
  },
  {
    id: 'sponsor-the-unit-fit',
    name: 'The Unit Fit',
    tagline: 'Gimnasio Personalizado • Marbella',
    logoUrl: '/images/sponsors/the-unit-fit.png',
    url: 'https://theunitfit.com/',
    bgClass: 'bg-[#0b0a09]',
  },
  {
    id: 'sponsor-ayuntamiento-marbella',
    name: 'Tenencia de Alcaldía de San Pedro Alcántara • Ayuntamiento de Marbella',
    tagline: 'Ayuntamiento de Marbella',
    logoUrl: '/images/sponsors/ayuntamiento-marbella.png',
    url: 'https://www.marbella.es/',
    bgClass: 'bg-[#0074BD]',
  },
];

export const INITIAL_CHANTS: Chant[] = [
  {
    id: 'chant-1',
    title: '¡Vamos mi San Pedro, a ganar!',
    rhythm: 'Palmas al compás acelerado',
    lyrics: `(Coro de grada)
¡Vamos mi San Pedro, hoy hay que ganar!
Desde Fuente Nueva hasta el bulevar,
¡Rojinegro el pecho, orgullo de verdad!
¡Punto a punto el Sergio Scariolo rugirá!
(Paaaaalmas: ¡San Pedro! ¡San Pedro! ¡Hey!)`,
  },
  {
    id: 'chant-2',
    title: 'San Pedro de mi vida',
    rhythm: 'Canto melódico con bufandas en alto',
    lyrics: `San Pedro de mi vida,
tú eres mi pasión,
defiéndeme esa bola,
con todo el corazón.
No importa la distancia,
ni quién esté enfrente,
¡el pueblo sampedreño
siempre está presente!`,
  },
  {
    id: 'chant-3',
    title: 'Bloqueo en la red',
    rhythm: 'Grito de guerra tras punto de bloqueo',
    lyrics: `¡Aquí no pasa nada!
¡Aquí mandamos hoy!
¡La red es una muralla,
de San Pedro yo soy!`,
  },
];

export const INITIAL_WALLPAPERS: WallpaperDownload[] = [
  {
    id: 'wp-1',
    title: 'Poder en la Red - Remate Espectacular',
    type: 'MOBILE',
    dimensions: '1080 x 1920 (9:16)',
    imageUrl: 'https://images.unsplash.com/photo-1686753767715-37cb0c34212c?w=1080&auto=format&fit=crop&q=80',
    downloadUrl: '/images/hero-spike.png',
  },
  {
    id: 'wp-2',
    title: 'Escudo Rojinegro - Fondo Estadio Carbono',
    type: 'DESKTOP',
    dimensions: '1920 x 1080 (16:9)',
    imageUrl: 'https://images.unsplash.com/photo-1728971121202-04896f2a35a4?w=1920&auto=format&fit=crop&q=80',
    downloadUrl: '/images/logo.jpg',
  },
  {
    id: 'wp-3',
    title: 'Cartel Oficial de Partido - Sergio Scariolo',
    type: 'POSTER',
    dimensions: 'A3 Formato PDF Alta Resolución',
    imageUrl: '/images/pabellon-sergio-scariolo.jpg',
    downloadUrl: '/images/pabellon-sergio-scariolo.jpg',
  },
];

// In-Memory Reactive Store
class DataStore {
  private categories: Category[] = [...INITIAL_CATEGORIES];
  private teams: Team[] = [...INITIAL_TEAMS];
  private players: Player[] = [...INITIAL_PLAYERS];
  private staff: Staff[] = [...INITIAL_STAFF];
  private matches: Match[] = [...INITIAL_MATCHES];
  private standings: Standings[] = [...INITIAL_STANDINGS];
  private articles: Article[] = [...INITIAL_ARTICLES];
  private sponsorTiers: SponsorTier[] = [...INITIAL_SPONSOR_TIERS];
  private sponsorInquiries: SponsorInquiry[] = [];
  private fanVotes: FanVote[] = [
    { id: 'fv-1', matchId: 'favb-1055', playerId: 'p-team-sf-2', ipHash: 'mock-1', createdAt: new Date().toISOString() },
    { id: 'fv-2', matchId: 'favb-1055', playerId: 'p-team-sf-2', ipHash: 'mock-2', createdAt: new Date().toISOString() },
    { id: 'fv-3', matchId: 'favb-1055', playerId: 'p-team-sf-1', ipHash: 'mock-3', createdAt: new Date().toISOString() },
  ];
  private pressAccreditations: PressAccreditation[] = [];
  private newsletterSubscribers: NewsletterSubscriber[] = [];
  private chants: Chant[] = [...INITIAL_CHANTS];
  private wallpapers: WallpaperDownload[] = [...INITIAL_WALLPAPERS];
  private mvpVotingActive: boolean = true;

  getCategories(): Category[] {
    return [...this.categories].sort((a, b) => a.order - b.order);
  }

  getTeams(): Team[] {
    return [...this.teams];
  }

  getTeamById(id: string): Team | undefined {
    return this.teams.find((t) => t.id === id);
  }

  getPlayers(teamId?: string): Player[] {
    if (teamId) {
      return this.players.filter((p) => p.teamId === teamId);
    }
    return [...this.players];
  }

  getStaff(teamId?: string): Staff[] {
    if (teamId) {
      return this.staff.filter((s) => s.teamId === teamId);
    }
    return [...this.staff];
  }

  getMatches(): Match[] {
    return [...this.matches].sort(
      (a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime()
    );
  }

  getFeaturedMatch(): Match | undefined {
    const live = this.matches.find((m) => m.status === 'LIVE');
    if (live) return live;
    const featured = this.matches.find((m) => m.isFeatured && m.status === 'SCHEDULED');
    if (featured) return featured;
    return this.matches.find((m) => m.status === 'SCHEDULED');
  }

  getRecentMatches(): Match[] {
    return this.matches
      .filter((m) => m.status === 'FINISHED')
      .sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime());
  }

  getUpcomingMatches(): Match[] {
    return this.matches
      .filter((m) => m.status === 'SCHEDULED')
      .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());
  }

  getStandings(categoryId?: string): Standings[] {
    let list = [...this.standings];
    if (categoryId) {
      list = list.filter((s) => s.categoryId === categoryId);
    }
    return list.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      const diffB = b.setsFor - b.setsAgainst;
      const diffA = a.setsFor - a.setsAgainst;
      return diffB - diffA;
    });
  }

  getArticles(): Article[] {
    return [...INITIAL_ARTICLES].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }

  getArticleBySlug(slug: string): Article | undefined {
    return INITIAL_ARTICLES.find((a) => a.slug === slug);
  }

  getSponsorTiers(): SponsorTier[] {
    return [...this.sponsorTiers];
  }

  getSponsorInquiries(): SponsorInquiry[] {
    return [...this.sponsorInquiries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  addSponsorInquiry(inquiry: Omit<SponsorInquiry, 'id' | 'createdAt'>): SponsorInquiry {
    const newInquiry: SponsorInquiry = {
      ...inquiry,
      id: `inq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    this.sponsorInquiries.unshift(newInquiry);
    return newInquiry;
  }

  getFanVotes(matchId?: string): FanVote[] {
    if (matchId) {
      return this.fanVotes.filter((v) => v.matchId === matchId);
    }
    return [...this.fanVotes];
  }

  getVoteCountForPlayer(playerId: string, matchId?: string): number {
    return this.fanVotes.filter(
      (v) => v.playerId === playerId && (!matchId || v.matchId === matchId)
    ).length;
  }

  hasUserVoted(matchId: string, ipHash: string): boolean {
    return this.fanVotes.some((v) => v.matchId === matchId && v.ipHash === ipHash);
  }

  addFanVote(matchId: string, playerId: string, ipHash: string): { success: boolean; message: string } {
    if (!this.mvpVotingActive) {
      return { success: false, message: 'La votación semanal de MVP está actualmente cerrada.' };
    }
    if (this.hasUserVoted(matchId, ipHash)) {
      return { success: false, message: 'Ya has registrado tu voto para este partido.' };
    }
    this.fanVotes.push({
      id: `vote-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      matchId,
      playerId,
      ipHash,
      createdAt: new Date().toISOString(),
    });
    return { success: true, message: '¡Voto registrado con éxito! Gracias por apoyar a nuestros deportistas.' };
  }

  isMvpVotingActive(): boolean {
    return this.mvpVotingActive;
  }

  setMvpVotingActive(active: boolean): void {
    this.mvpVotingActive = active;
  }

  resetFanVotes(): void {
    this.fanVotes = [];
  }

  getPressAccreditations(): PressAccreditation[] {
    return [...this.pressAccreditations].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  addPressAccreditation(data: Omit<PressAccreditation, 'id' | 'createdAt' | 'status'>): PressAccreditation {
    const acc: PressAccreditation = {
      ...data,
      id: `acc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };
    this.pressAccreditations.unshift(acc);
    return acc;
  }

  getNewsletterSubscribers(): NewsletterSubscriber[] {
    return [...this.newsletterSubscribers];
  }

  addNewsletterSubscriber(email: string): { success: boolean; message: string } {
    const cleanEmail = email.trim().toLowerCase();
    if (this.newsletterSubscribers.some((s) => s.email === cleanEmail)) {
      return { success: false, message: 'Este correo electrónico ya está suscrito al boletín oficial.' };
    }
    this.newsletterSubscribers.push({
      id: `sub-${Date.now()}`,
      email: cleanEmail,
      createdAt: new Date().toISOString(),
    });
    return { success: true, message: '¡Gracias por suscribirte al boletín del C.D. Voleibol San Pedro!' };
  }

  getChants(): Chant[] {
    return [...this.chants];
  }

  getWallpapers(): WallpaperDownload[] {
    return [...this.wallpapers];
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __voleibolStore: DataStore | undefined;
}

export const store: DataStore = globalThis.__voleibolStore || new DataStore();
if (process.env.NODE_ENV !== 'production') {
  globalThis.__voleibolStore = store;
}
