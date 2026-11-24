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

import { CLUB_INFO } from './club-info';
export { CLUB_INFO };

import {
  INITIAL_ARTICLES,
  INITIAL_SPONSOR_TIERS,
  CURRENT_SPONSORS,
  INITIAL_CHANTS,
  INITIAL_WALLPAPERS,
} from './public-content';
export {
  INITIAL_ARTICLES,
  INITIAL_SPONSOR_TIERS,
  CURRENT_SPONSORS,
  INITIAL_CHANTS,
  INITIAL_WALLPAPERS,
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
