import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getFastFavbMatchesSnapshot, FavbMatch } from '@/lib/favb-scraper';
import { FAVB_PLAYERS, resolveCanonicalPlayerId } from '@/lib/favb-data';
import { resolveCensusBirthDate } from '@/lib/consent-store';
import { queryNeon, NeonUnavailableError, isValidMatchId } from '@/lib/streaming-store';
import { getClientIp, checkNeonRateLimit } from '@/lib/rate-limiter';
import { computeAgeInMadrid } from '@/lib/date-utils';
import { getOtpPepper } from '@/lib/encryption';
import { isRestMatch } from '@/lib/match-utils';

export const dynamic = 'force-dynamic';

interface CensusRow {
  player_id: string;
  canonical_player_id: string | null;
  player_name: string;
  birth_year: number | null;
  birth_date: string | null;
  birth_date_encrypted: string | null;
  is_demo: boolean;
}

interface ConsentRow {
  player_id: string;
  status: string;
  consent_social_media: boolean;
  is_minor: boolean;
}

interface MvpCandidate {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  number: number;
  photoUrl: string;
}

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, must-revalidate',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
};

function computeVoterIpHash(clientIp: string, matchId: string): string {
  const pepper = getOtpPepper();
  return crypto
    .createHash('sha256')
    .update(`${pepper}:${clientIp}:${matchId}`)
    .digest('hex');
}

function resolveBirthDate(row: CensusRow | undefined, canonicalId: string): string | null {
  if (!row) return null;
  return resolveCensusBirthDate(row, canonicalId);
}

async function resolveMvpMatchAndCandidates(requestedMatchId?: string): Promise<{
  match: FavbMatch | null;
  candidates: MvpCandidate[];
}> {
  const snapshot = await getFastFavbMatchesSnapshot();
  const finishedMatches = snapshot.matches
    .filter((m) => !isRestMatch(m) && m.status === 'FINISHED')
    .sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime());

  const seniorFinished = finishedMatches.filter(
    (m) => m.categoryId === 'cat-senior-fem' || m.categoryId === 'cat-senior-masc'
  );

  let targetMatch: FavbMatch | null = null;
  if (requestedMatchId) {
    targetMatch =
      seniorFinished.find((m) => m.id === requestedMatchId) ||
      finishedMatches.find((m) => m.id === requestedMatchId) ||
      null;
  } else {
    targetMatch = seniorFinished[0] || finishedMatches[0] || null;
  }

  if (!targetMatch) {
    return { match: null, candidates: [] };
  }

  const [censusRows, consentRows] = await Promise.all([
    queryNeon<CensusRow>(
      `SELECT player_id, canonical_player_id, player_name,
              birth_year, birth_date, birth_date_encrypted, COALESCE(is_demo, false) AS is_demo
       FROM player_census;`
    ),
    queryNeon<ConsentRow>(
      `SELECT player_id, status, consent_social_media, is_minor
       FROM player_consents
       ORDER BY (CASE WHEN status = 'ACTIVE' THEN 0 ELSE 1 END), updated_at DESC;`
    ),
  ]);

  const censusByCanonicalId = new Map<string, CensusRow>();
  for (const row of censusRows) {
    const canonicalId = resolveCanonicalPlayerId(row.canonical_player_id || row.player_id);
    if (!censusByCanonicalId.has(canonicalId)) {
      censusByCanonicalId.set(canonicalId, row);
    }
  }

  const consentByCanonicalId = new Map<string, ConsentRow>();
  for (const c of consentRows) {
    const canonicalId = resolveCanonicalPlayerId(c.player_id);
    const prev = consentByCanonicalId.get(canonicalId);
    if (!prev) {
      consentByCanonicalId.set(canonicalId, c);
    } else if (
      prev.player_id !== c.player_id &&
      prev.status === 'ACTIVE' &&
      prev.consent_social_media &&
      (c.status !== 'ACTIVE' || !c.consent_social_media)
    ) {
      consentByCanonicalId.set(canonicalId, c);
    }
  }

  const targetTeamId = targetMatch.teamId || 'team-sf';
  const teamPlayers = FAVB_PLAYERS.filter(
    (p) =>
      !p.id.startsWith('demo-') &&
      p.id !== 'p-test-prueba' &&
      (p.teamId === targetTeamId || p.secondaryTeamIds?.includes(targetTeamId))
  );

  const candidates: MvpCandidate[] = [];

  for (const p of teamPlayers) {
    const canonicalId = resolveCanonicalPlayerId(p.id);
    const census = censusByCanonicalId.get(canonicalId);
    if (census?.is_demo) continue;

    const consent = consentByCanonicalId.get(canonicalId);
    if (consent && (consent.status !== 'ACTIVE' || consent.consent_social_media === false)) {
      continue;
    }

    const birthDate = resolveBirthDate(census, canonicalId);
    const birthYear = census?.birth_year ?? (p.birthYear > 0 ? p.birthYear : null);
    const ageEval = computeAgeInMadrid(birthDate, birthYear);

    // Solo adultos (+18 verificados) en la votación pública MVP
    if (ageEval.isMinor || consent?.is_minor) {
      continue;
    }

    const hasActiveSocial = consent?.status === 'ACTIVE' && consent.consent_social_media === true;
    candidates.push({
      id: canonicalId,
      firstName: p.firstName,
      lastName: p.lastName,
      displayName: `${p.firstName} ${p.lastName}`.trim(),
      number: p.number,
      photoUrl: hasActiveSocial ? p.photoUrl || '/images/player-placeholder.svg' : '/images/player-placeholder.svg',
    });
  }

  candidates.sort((a, b) => a.number - b.number);
  return { match: targetMatch, candidates };
}

async function fetchVoteSummary(matchId: string, ipHash: string): Promise<{
  voteCounts: Record<string, number>;
  totalVotes: number;
  hasVoted: boolean;
}> {
  const [countRows, userVoteRows] = await Promise.all([
    queryNeon<{ playerId: string; votes: number }>(
      `SELECT "playerId", COUNT(*)::int AS votes
       FROM "FanVote"
       WHERE "matchId" = $1
       GROUP BY "playerId";`,
      [matchId]
    ),
    queryNeon<{ id: string }>(
      `SELECT "id" FROM "FanVote" WHERE "matchId" = $1 AND "ipHash" = $2 LIMIT 1;`,
      [matchId, ipHash]
    ),
  ]);

  const voteCounts: Record<string, number> = {};
  let totalVotes = 0;
  for (const row of countRows) {
    const cId = resolveCanonicalPlayerId(row.playerId);
    const count = Number(row.votes) || 0;
    voteCounts[cId] = (voteCounts[cId] || 0) + count;
    totalVotes += count;
  }

  return {
    voteCounts,
    totalVotes,
    hasVoted: userVoteRows.length > 0,
  };
}

export async function GET(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rlGet = await checkNeonRateLimit(`mvp-vote-get:${clientIp}`, 60, 60, 60);
    if (!rlGet.allowed) {
      return NextResponse.json(
        { success: false, error: 'Demasiadas consultas de votación. Espera unos segundos.' },
        {
          status: 429,
          headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rlGet.retryAfterSec) },
        }
      );
    }
    const { match, candidates } = await resolveMvpMatchAndCandidates();

    if (!match) {
      return NextResponse.json(
        {
          success: true,
          match: null,
          candidates: [],
          voteCounts: {},
          totalVotes: 0,
          hasVoted: false,
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    const ipHash = computeVoterIpHash(clientIp, match.id);
    const summary = await fetchVoteSummary(match.id, ipHash);

    return NextResponse.json(
      {
        success: true,
        match: {
          id: match.id,
          teamId: match.teamId,
          categoryName: match.categoryName,
          round: match.round,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          matchDate: match.matchDate,
        },
        candidates,
        voteCounts: summary.voteCounts,
        totalVotes: summary.totalVotes,
        hasVoted: summary.hasVoted,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    if (error instanceof NeonUnavailableError) {
      return NextResponse.json(
        { success: false, error: 'Servicio de votación temporalmente no disponible.' },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }
    console.error('[API Public MVP Vote GET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'No se pudo cargar la votación MVP.' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rl = await checkNeonRateLimit(`mvp-vote:${clientIp}`, 15, 600, 900);
    if (!rl.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Demasiados intentos. Espera ${Math.ceil(rl.retryAfterSec / 60)} minutos.`,
        },
        {
          status: 429,
          headers: { ...NO_STORE_HEADERS, 'Retry-After': String(rl.retryAfterSec) },
        }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Solicitud JSON no válida.' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    // Honeypot anti-bots
    if (typeof body.website === 'string' && body.website.trim().length > 0) {
      return NextResponse.json(
        { success: false, error: 'Solicitud rechazada.' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const rawMatchId = typeof body.matchId === 'string' ? body.matchId.trim() : '';
    const rawPlayerId = typeof body.playerId === 'string' ? body.playerId.trim() : '';

    if (!isValidMatchId(rawMatchId) || !rawPlayerId || rawPlayerId.length > 64) {
      return NextResponse.json(
        { success: false, error: 'Partido o deportista no válido.' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const canonicalPlayerId = resolveCanonicalPlayerId(rawPlayerId);
    const { match, candidates } = await resolveMvpMatchAndCandidates(rawMatchId);

    if (!match || match.id !== rawMatchId) {
      return NextResponse.json(
        { success: false, error: 'El partido seleccionado no está disponible para votación.' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const isEligible = candidates.some((c) => c.id === canonicalPlayerId);
    if (!isEligible) {
      return NextResponse.json(
        { success: false, error: 'El/la deportista seleccionado/a no es elegible para esta votación.' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const ipHash = computeVoterIpHash(clientIp, match.id);
    const voteId = `fv-${crypto.randomUUID()}`;

    const inserted = await queryNeon<{ id: string }>(
      `INSERT INTO "FanVote" ("id", "matchId", "playerId", "ipHash", "createdAt")
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT ("matchId", "ipHash") DO NOTHING
       RETURNING "id";`,
      [voteId, match.id, canonicalPlayerId, ipHash]
    );

    if (inserted.length === 0) {
      const summary = await fetchVoteSummary(match.id, ipHash);
      return NextResponse.json(
        {
          success: false,
          alreadyVoted: true,
          error: 'Ya has registrado tu voto para este partido.',
          voteCounts: summary.voteCounts,
          totalVotes: summary.totalVotes,
          hasVoted: true,
        },
        { status: 409, headers: NO_STORE_HEADERS }
      );
    }

    const summary = await fetchVoteSummary(match.id, ipHash);

    return NextResponse.json(
      {
        success: true,
        message: '¡Voto registrado con éxito! Gracias por apoyar al equipo.',
        voteCounts: summary.voteCounts,
        totalVotes: summary.totalVotes,
        hasVoted: true,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    if (error instanceof NeonUnavailableError) {
      return NextResponse.json(
        { success: false, error: 'Servicio de votación temporalmente no disponible.' },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }
    console.error('[API Public MVP Vote POST] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al registrar tu voto.' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
