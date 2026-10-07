export type Position = 'SETTER' | 'OPPOSITE' | 'OUTSIDE_HITTER' | 'MIDDLE_BLOCKER' | 'LIBERO';

export const POSITION_LABELS: Record<Position, string> = {
  SETTER: 'Colocador / Colocadora',
  OPPOSITE: 'Opuesto / Opuesta',
  OUTSIDE_HITTER: 'Receptor / Punta',
  MIDDLE_BLOCKER: 'Central',
  LIBERO: 'Líbero',
};

export const POSITION_SHORT_LABELS: Record<Position, string> = {
  SETTER: 'Colocador',
  OPPOSITE: 'Opuesto',
  OUTSIDE_HITTER: 'Receptor/Punta',
  MIDDLE_BLOCKER: 'Central',
  LIBERO: 'Líbero',
};

export type StaffRole = 'HEAD_COACH' | 'ASSISTANT' | 'PHYSIO' | 'TRAINER';

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  HEAD_COACH: 'Primer Entrenador',
  ASSISTANT: 'Segundo Entrenador',
  PHYSIO: 'Fisioterapeuta',
  TRAINER: 'Preparador Físico',
};

export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELLED';

export interface SetScore {
  home: number;
  away: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  order: number;
  description?: string;
}

export interface Team {
  id: string;
  categoryId: string;
  name: string;
  division: string;
  season: string;
}

export interface Player {
  id: string;
  teamId: string;
  number: number;
  firstName: string;
  lastName: string;
  position: Position;
  birthYear: number;
  heightCm: number;
  photoUrl: string;
  isCaptain: boolean;
  isHomegrown: boolean;
}

export interface Staff {
  id: string;
  teamId: string;
  name: string;
  role: StaffRole;
  photoUrl: string;
}

export interface Match {
  id: string;
  teamId: string;
  round: number;
  homeTeamName: string;
  awayTeamName: string;
  isClubHome: boolean;
  venueName: string;
  matchDate: string; // ISO string in UTC
  status: MatchStatus;
  setScores: SetScore[];
  favbMatchUrl?: string;
  mvpPlayerId?: string;
  isFeatured?: boolean;
}

export interface Standings {
  id: string;
  categoryId: string;
  teamName: string;
  isCurrentClub: boolean;
  played: number;
  won: number;
  lost: number;
  setsFor: number;
  setsAgainst: number;
  points: number;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  contentMarkdown: string;
  categoryId: string;
  categoryName: string;
  coverImageUrl: string;
  publishedAt: string; // ISO string
  isFeatured: boolean;
  readingTimeMinutes: number;
  galleryUrls?: string[];
}

export interface SponsorTier {
  id: string;
  name: string;
  priceAnnual: string;
  description: string;
  features: string[];
  isFeatured: boolean;
}

export interface SponsorInquiry {
  id: string;
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  packageInterested: string;
  message: string;
  createdAt: string;
}

export interface FanVote {
  id: string;
  matchId: string;
  playerId: string;
  ipHash: string;
  createdAt: string;
}

export interface Chant {
  id: string;
  title: string;
  rhythm: string;
  lyrics: string;
}

export interface WallpaperDownload {
  id: string;
  title: string;
  type: 'MOBILE' | 'DESKTOP' | 'POSTER';
  dimensions: string;
  imageUrl: string;
  downloadUrl: string;
}

export interface PressAccreditation {
  id: string;
  fullName: string;
  mediaOutlet: string;
  role: string;
  email: string;
  phone: string;
  matchId: string;
  notes?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  createdAt: string;
}

export interface ClubInfo {
  name: string;
  shortName: string;
  federationRegisteredName?: string;
  cif?: string;
  president?: string;
  officialAddress?: string;
  postalCode?: string;
  province?: string;
  city: string;
  region: string;
  venueName: string;
  venueAddress: string;
  venueMapsUrl: string;
  federationName: string;
  federationUrl: string;
  contactEmail: string;
  contactPhone: string;
  whatsappUrl: string;
  socialHashtag: string;
  motto: string;
}
