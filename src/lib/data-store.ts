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
    id: 'art-1',
    title: 'El Senior Masculino ruge en el Sergio Scariolo ante más de 400 sampedreños',
    slug: 'senior-masculino-vence-derbi-sergio-scariolo',
    excerpt: 'Con un pabellón volcado animando al equipo, el conjunto sampedreño firmó una actuación soberbia en 1ª División Andaluza.',
    contentMarkdown: `El ambiente en el Pabellón Polideportivo Sergio Scariolo fue de los que quedan grabados en la memoria colectiva del voleibol sampedreño. Con las gradas completamente llenas por familias y aficionados locales, el C.D. Voleibol San Pedro firmó una actuación soberbia ante el CV Marbella (25-20, 25-23, 25-19).

### Dominio táctico y bloqueo asfixiante
Desde el primer punto, el colocador y capitán Alejandro García impuso un ritmo veloz y variado en la distribución. Los remates de David López y la contundencia de Mateo Fernández por zona dos desarticularon la defensa rival. En la red, el bloqueo sampedreño fue un auténtico muro.

### Un pabellón volcado con el voleibol formativo
Ver a los niños y niñas de las categorías de cantera animando detrás del banquillo con banderas y tambores es el verdadero triunfo de nuestro club. Seguimos trabajando con la máxima humildad de cara a los próximos choques de la FAVB.`,
    categoryId: 'cat-senior-masc-a',
    categoryName: 'Senior Masculino',
    coverImageUrl: 'https://images.unsplash.com/photo-1728971124745-423b12df446d?w=1200&auto=format&fit=crop&q=80',
    publishedAt: '2026-10-04T18:00:00.000Z',
    isFeatured: true,
    readingTimeMinutes: 3,
    galleryUrls: [
      'https://images.unsplash.com/photo-1729564615215-9df5ef19b971?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1553005746-9245ba190489?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1567880325673-ccc01edca61c?w=800&auto=format&fit=crop&q=80',
    ],
  },
  {
    id: 'art-2',
    title: 'Arrancan las Ligas Provinciales de Cantera de la FAVB con 8 equipos sampedreños',
    slug: 'arranque-ligas-provinciales-cantera-favb',
    excerpt: 'Nuestros equipos Júnior, Juvenil, Cadete e Infantil debutan este mes en las competiciones oficiales de la Federación Andaluza.',
    contentMarkdown: `La temporada 2026/2027 echa a rodar de forma oficial para toda la estructura deportiva del C.D. Voleibol San Pedro. En esta campaña competimos con 8 conjuntos de base en las Ligas Provinciales de Málaga organizadas por la FAVB (favoley.net): Júnior Masculino y Femenino, Juvenil Masculino y Femenino, Cadete Masculino y Femenino, e Infantil Masculino y Femenino.

El objetivo del club se mantiene intacto: formación deportiva, hábitos saludables y compañerismo en cada entrenamiento y partido en el Pabellón Sergio Scariolo.`,
    categoryId: 'cat-cantera',
    categoryName: 'Cantera FAVB',
    coverImageUrl: 'https://images.unsplash.com/photo-1547347298-4074fc3086f0?w=1200&auto=format&fit=crop&q=80',
    publishedAt: '2026-10-05T12:00:00.000Z',
    isFeatured: false,
    readingTimeMinutes: 2,
  },
  {
    id: 'art-3',
    title: 'Jornada de Tecnificación y Arbitraje con la Delegación Malagueña de Voleibol',
    slug: 'jornada-tecnificacion-arbitraje-sergio-scariolo',
    excerpt: 'El Pabellón Sergio Scariolo acoge un encuentro formativo para entrenadores y árbitros federados de la provincia.',
    contentMarkdown: `Este fin de semana nuestras instalaciones albergaron una sesión de actualización sobre el reglamento de voleibol FAVB y actas digitales, reforzando el compromiso de San Pedro Alcántara con el desarrollo integral de nuestro deporte.`,
    categoryId: 'cat-inst',
    categoryName: 'Institucional',
    coverImageUrl: 'https://images.unsplash.com/photo-1706206817521-6d74effeb6c7?w=1200&auto=format&fit=crop&q=80',
    publishedAt: '2026-09-28T09:00:00.000Z',
    isFeatured: false,
    readingTimeMinutes: 2,
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
    return [...this.articles].sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
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
