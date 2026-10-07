import {
  Category,
  Team,
  Player,
  Staff,
  Match,
  Standings,
  Article,
  SponsorTier,
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
  city: 'San Pedro Alcántara, Marbella',
  region: 'Málaga, Andalucía',
  venueName: 'Pabellón Polideportivo Sergio Scariolo',
  venueAddress: 'C/ Fuente Nueva, s/n, 29670 San Pedro Alcántara (Málaga)',
  venueMapsUrl: 'https://maps.google.com/?q=Pabellon+Polideportivo+Sergio+Scariolo+San+Pedro+Alcantara',
  federationName: 'Federación Andaluza de Voleibol (FAVB)',
  federationUrl: 'https://favoley.net/publico/index.php',
  contactEmail: 'info@cdvoleibolsanpedro.es',
  contactPhone: '+34 952 78 50 12',
  whatsappUrl: 'https://wa.me/34622112233?text=Hola%2C%20me%20gustar%C3%ADa%20informaci%C3%B3n%20sobre%20el%20C.D.%20Voleibol%20San%20Pedro',
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

export const INITIAL_CATEGORIES: Category[] = FAVB_CATEGORIES;
export const INITIAL_TEAMS: Team[] = FAVB_TEAMS;
export const INITIAL_PLAYERS: Player[] = FAVB_PLAYERS;
export const INITIAL_STAFF: Staff[] = FAVB_STAFF;
export const INITIAL_MATCHES: Match[] = FAVB_MATCHES;
export const INITIAL_STANDINGS: Standings[] = FAVB_STANDINGS;

export const INITIAL_ARTICLES: Article[] = [
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
    categoryName: 'Institucional y FAVB',
    coverImageUrl: '/images/noticias/nuevas-reglas-2026.png',
    publishedAt: '2026-10-06T18:00:00.000Z',
    isFeatured: true,
    readingTimeMinutes: 4,
  },
  {
    id: 'art-loteria-2026',
    title: 'Lotería de Navidad 2026: Juega con el C.D. Voleibol San Pedro al número 15.586 y apoya al club',
    slug: 'loteria-navidad-2026-voleibol-san-pedro-15586',
    excerpt: 'Desde el club se ponen a la venta los décimos de la tradicional Lotería Nacional de Navidad (22 de diciembre de 2026). El número de este año es el 15.586 y el precio de venta es de 23 €, incluyendo un donativo de apoyo a nuestra cantera.',
    contentMarkdown: `El C.D. Voleibol San Pedro pone a la venta los décimos de la tradicional Lotería Nacional de Navidad para el sorteo extraordinario del próximo **22 de diciembre de 2026**.

Compartir este número es una de las tradiciones más queridas por nuestras familias, socios, jugadores y aficionados. Con cada décimo adquirido, además de jugar por los grandes premios de la Lotería de Navidad, estás colaborando de forma directa y decisiva con el proyecto formativo de nuestro club en San Pedro Alcántara.

### 15.586

### Datos del Décimo Oficial

- **Número jugado:** **15.586**
- **Fecha del sorteo:** 22 de diciembre de 2026 (S.E. Loterías y Apuestas del Estado).
- **Precio por décimo:** **23 €** (20 € de jugada reglamentaria de Loterías del Estado + 3 € de donativo solidario destinado íntegramente a apoyar al club y a su cantera).
- **Viñeta conmemorativa:** Ilustrado con la obra «La Natividad en el Templo» (tabla central del Tríptico realizado por el Maestro de las Medias Figuras, cedida por el Museo Nacional del Prado) y con el distintivo oficial del **VOLEIBOL SAN PEDRO**.

### ¿A qué se destina el apoyo de tu décimo?

El importe íntegro del donativo (3 € por décimo) se reinvierte en las necesidades reales del día a día de nuestros equipos de cantera en el Pabellón Sergio Scariolo:

- Renovación y reposición de balones oficiales homologados de competición (Mikasa V200W).
- Equipamiento de entrenamiento, redes, carros porta-balones y material de preparación física.
- Gastos de desplazamientos en autobús para los partidos de ligas provinciales y autonómicas de la FAVB.
- Cobertura de arbitrajes y licencias federativas para las categorías inferiores.

### ¿Cómo y dónde adquirir tu décimo?

Puedes hacerte con tus décimos del **15.586** de varias formas sencillas:

1. **En el Pabellón Polideportivo Sergio Scariolo:** Pregunta directamente a cualquiera de los entrenadores o delegados de equipo durante los entrenamientos semanales de cantera y del primer equipo.
2. **Reserva directa por WhatsApp:** Si prefieres coordinar tu reserva previamente con los responsables del club, puedes escribirnos directamente:

[Reservar décimos por WhatsApp (+34 952 78 50 12)](https://wa.me/34622112233?text=Hola%2C%20estoy%20interesado%20en%20comprar%20decimos%20de%20Loteria%20de%20Navidad%20del%20Voleibol%20San%20Pedro%20(15.586))

3. **Comercios colaboradores:** Diversos establecimientos y comercios amigos de San Pedro Alcántara contarán con décimos disponibles para clientes y simpatizantes en sus mostradores.

¡No te quedes sin tu décimo del **15.586**! Muchísima suerte a toda la gran familia sampedreña y gracias de corazón por respaldar el voleibol formativo de nuestro pueblo.`,
    categoryId: 'cat-inst',
    categoryName: 'Club e Institucional',
    coverImageUrl: '/images/noticias/loteria-navidad-2026.png',
    publishedAt: '2026-10-06T19:00:00.000Z',
    isFeatured: true,
    readingTimeMinutes: 2,
  },
  {
    id: 'art-cantera-favb',
    title: 'Arrancan las Ligas Provinciales de Cantera de la FAVB con 8 equipos sampedreños',
    slug: 'arranque-ligas-provinciales-cantera-favb',
    excerpt: 'Nuestros equipos Júnior, Juvenil, Cadete e Infantil debutan este mes en las competiciones oficiales de la Federación Andaluza de Voleibol en el Pabellón Sergio Scariolo.',
    contentMarkdown: `La temporada 2026/2027 echa a rodar de forma oficial para toda la estructura de cantera del C.D. Voleibol San Pedro. En esta campaña histórica, el club inscribe un récord de 8 conjuntos federados en las Ligas Provinciales de Málaga organizadas por la Federación Andaluza de Voleibol (FAVB).

La apuesta decidida por el voleibol base sampedreño se consolida con presencia en todas las franjas de edad, dando cabida a más de 120 chicos y chicas de San Pedro Alcántara y la Costa del Sol occidental.

### Categorías federadas en liza

Nuestra representación para el curso 26/27 queda estructurada en las siguientes divisiones:

- **Júnior:** Conjuntos Júnior Masculino y Júnior Femenino, compitiendo en el máximo nivel formativo provincial previo al salto sénior.
- **Juvenil:** Equipos Juvenil Masculino y Juvenil Femenino, buscando revalidar los puestos de fase final andaluza.
- **Cadete:** Cadete Masculino y Cadete Femenino, franja de consolidación táctica y ritmo de juego.
- **Infantil:** Infantil Masculino e Infantil Femenino, la base del club donde se fomentan los fundamentos del saque, pase y colocación.

### El Pabellón Sergio Scariolo como sede central

Todos los encuentros como local se disputarán en la pista central del Pabellón Polideportivo Sergio Scariolo durante las mañanas de los sábados y domingos. La entrada para presenciar los partidos de cantera es completamente libre y gratuita para familiares, vecinos y aficionados.

Invitamos a todo el pueblo de San Pedro a llenar las gradas y arropar a nuestros jóvenes canteranos en cada saque y remate.

### Seguimiento oficial en el portal FAVB

Todos los calendarios, actas electrónicas y clasificaciones se actualizan en tiempo real a través del portal de la federación:

[Consultar portal oficial de la Federación Andaluza de Voleibol](https://favoley.net/publico/index.php)`,
    categoryId: 'cat-cantera',
    categoryName: 'Cantera FAVB',
    coverImageUrl: 'https://images.unsplash.com/photo-1547347298-4074fc3086f0?w=1200&auto=format&fit=crop&q=80',
    publishedAt: '2026-10-05T12:00:00.000Z',
    isFeatured: false,
    readingTimeMinutes: 3,
  },
  {
    id: 'art-senior-derbi',
    title: 'El Senior Masculino ruge en el Sergio Scariolo ante más de 400 sampedreños',
    slug: 'senior-masculino-vence-derbi-sergio-scariolo',
    excerpt: 'Con un pabellón volcado animando al equipo, el conjunto sampedreño firmó una actuación soberbia en 1ª División Andaluza superando con solvencia al CV Marbella (3-0).',
    contentMarkdown: `El ambiente vivido este fin de semana en el Pabellón Polideportivo Sergio Scariolo fue de los que quedan grabados en la memoria colectiva del voleibol sampedreño. Con las gradas completamente abarrotadas por más de 400 personas, el primer equipo del C.D. Voleibol San Pedro firmó una actuación soberbia ante el CV Marbella, adjudicándose el derbi provincial por un contundente 3-0 (25-20, 25-23, 25-19).

### Dominio táctico y bloqueo asfixiante

Desde el primer punto del partido, el colocador y capitán Alejandro García impuso un ritmo veloz y variado en la distribución del juego sampedreño. Los remates contundentes por zona cuatro y la efectividad por el centro desarticularon la defensa rival en los tramos decisivos.

En la red, el bloqueo sampedreño se mostró infranqueable:

- **Efectividad en recepción:** 68% de balones perfectos en el primer toque.
- **Puntos de bloqueo directo:** 14 bloqueos ganadores frente al ataque rival.
- **Acierto en remate:** 58% de efectividad en balones de contrataque.

### Un pabellón volcado con el orgullo local

Ver a los niños y niñas de todas las categorías de cantera animando detrás del banquillo con tambores, banderas rojinegras y bufandas es el verdadero triunfo y la mayor recompensa para este proyecto deportivo.

El club agradece a la afición su entrega incondicional e invita a mantener este ambiente en el próximo compromiso de liga en casa.`,
    categoryId: 'cat-senior-masc-a',
    categoryName: 'Senior Masculino',
    coverImageUrl: 'https://images.unsplash.com/photo-1728971124745-423b12df446d?w=1200&auto=format&fit=crop&q=80',
    publishedAt: '2026-10-04T18:00:00.000Z',
    isFeatured: false,
    readingTimeMinutes: 3,
  },
];

export const INITIAL_SPONSOR_TIERS: SponsorTier[] = [
  {
    id: 'sp-1',
    name: 'Comercio Amigo de San Pedro',
    priceAnnual: '250 € / temporada',
    description: 'Pensado para cafeterías, panaderías, talleres y comercios locales de San Pedro que quieren apoyar a los jóvenes del pueblo.',
    features: [
      'Logotipo y mención en la sección de Patrocinadores de la web oficial',
      'Distintivo físico adhesivo oficial: "Establecimiento Colaborador C.D.V. San Pedro"',
      'Menciones mensuales de agradecimiento en redes sociales oficiales (#VoleibolSanPedro)',
      'Acceso al club de empresas colaboradoras',
    ],
    isFeatured: false,
  },
  {
    id: 'sp-2',
    name: 'Lona en Pabellón Sergio Scariolo',
    priceAnnual: '600 € / temporada',
    description: 'Máxima visibilidad de marca en cada jornada de liga y torneos federados para empresas de Marbella, Estepona y la Costa del Sol.',
    features: [
      'Pancarta publicitaria de 3x1 metros a pie de pista o barandilla en el Pabellón Sergio Scariolo',
      'Presencia destacada en el faldón de la web oficial',
      'Agradecimiento por megafonía en los partidos de 1ª División Andaluza',
      'Dossier fotográfico de tu marca en pista para uso comercial propio',
    ],
    isFeatured: true,
  },
  {
    id: 'sp-3',
    name: 'Patrocinador de Cantera',
    priceAnnual: '1.500 € / temporada',
    description: 'Apoya el equipamiento y desplazamientos de las categorías de cantera del voleibol sampedreño.',
    features: [
      'Logotipo en la camiseta de juego oficial de categorías de Cantera',
      'Presencia en cartelería oficial física y digital',
      'Espacio editorial destacado en la web oficial y boletín informativo',
      'Agradecimiento especial en la clausura de temporada',
    ],
    isFeatured: false,
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
    imageUrl: 'https://images.unsplash.com/photo-1666901356149-93f2eb3ba5a2?w=1200&auto=format&fit=crop&q=80',
    downloadUrl: '/images/hero-spike.png',
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
    { id: 'fv-1', matchId: 'm-past-1', playerId: 'p-sma-2', ipHash: 'mock-1', createdAt: new Date().toISOString() },
    { id: 'fv-2', matchId: 'm-past-1', playerId: 'p-sma-2', ipHash: 'mock-2', createdAt: new Date().toISOString() },
    { id: 'fv-3', matchId: 'm-past-1', playerId: 'p-sma-1', ipHash: 'mock-3', createdAt: new Date().toISOString() },
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
    const featured = this.matches.find((m) => m.isFeatured);
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
    return [...this.articles].sort((a, b) => {
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
  }

  getArticleBySlug(slug: string): Article | undefined {
    return this.articles.find((a) => a.slug === slug);
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
