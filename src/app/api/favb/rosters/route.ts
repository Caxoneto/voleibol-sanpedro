import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { syncFavbRosters } from '@/lib/favb-scraper';
import { FAVB_PLAYERS, resolveCanonicalPlayerId } from '@/lib/favb-data';
import { formatPlayerNameWithInitials } from '@/lib/club-info';
import { resolveCensusBirthDate } from '@/lib/consent-store';
import { queryNeon, NeonUnavailableError } from '@/lib/streaming-store';
import { checkNeonRateLimit, getClientIp, verifyAdminSessionToken } from '@/lib/rate-limiter';
import type { Player } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface CensusPrivacyRow {
  player_id: string;
  canonical_player_id: string | null;
  player_name: string;
  team_id: string;
  birth_year: number | null;
  birth_date: string | null;
  birth_date_encrypted: string | null;
  is_demo: boolean;
}

interface ConsentPrivacyRow {
  player_id: string;
  player_name: string;
  status: string;
  consent_social_media: boolean;
  is_minor: boolean;
}

export type PublicSanitizedPlayer = Omit<Player, 'birthYear' | 'heightCm'> & {
  displayName: string;
  isAnonymized?: boolean;
};

function normalizeNameKey(raw: string): string {
  return String(raw || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveBirthDateFromRow(row: CensusPrivacyRow, canonicalId: string): string | null {
  return resolveCensusBirthDate(row, canonicalId);
}

export async function GET(req: NextRequest) {
  const noStoreHeaders = {
    'Cache-Control': 'private, no-store, must-revalidate',
    Pragma: 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  };

  try {
    const clientIp = getClientIp(req);
    const rl = await checkNeonRateLimit(`favb-rosters:${clientIp}`, 60, 60, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Demasiadas consultas de plantillas. Espera unos segundos.' },
        {
          status: 429,
          headers: { ...noStoreHeaders, 'Retry-After': String(rl.retryAfterSec) },
        }
      );
    }
  } catch (err) {
    if (err instanceof NeonUnavailableError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Base de datos de privacidad temporalmente no disponible. No se pueden mostrar plantillas.',
        },
        { status: 503, headers: noStoreHeaders }
      );
    }
  }

  const { searchParams } = new URL(req.url);
  const requestedForce = searchParams.get('force') === 'true';
  const rawTeamId = searchParams.get('teamId') || undefined;
  const teamId = rawTeamId && /^[a-zA-Z0-9_-]{1,64}$/.test(rawTeamId) ? rawTeamId : undefined;

  let isAdmin = false;
  if (requestedForce) {
    const token = cookies().get('cdv_admin_session')?.value;
    if (token) {
      try {
        isAdmin = await verifyAdminSessionToken(token);
      } catch {
        isAdmin = false;
      }
    }
  }
  const force = requestedForce && isAdmin;

  try {
    // 1. Consulta obligatoria fail-closed en Neon antes de exponer plantillas públicas
    const [censusRows, consentRows, result] = await Promise.all([
      queryNeon<CensusPrivacyRow>(
        `SELECT player_id, canonical_player_id, player_name, team_id,
                birth_year, birth_date, birth_date_encrypted, COALESCE(is_demo, false) AS is_demo
         FROM player_census;`
      ),
      queryNeon<ConsentPrivacyRow>(
        `SELECT player_id, player_name, status, consent_social_media, is_minor
         FROM player_consents
         ORDER BY (CASE WHEN status = 'ACTIVE' THEN 0 ELSE 1 END), updated_at DESC;`
      ),
      syncFavbRosters(force, teamId),
    ]);

    // Índices canónicos para cruzar censo y consentimientos
    const canonicalInfoById = new Map<
      string,
      { isDemo: boolean }
    >();
    const canonicalIdByName = new Map<string, string>();

    for (const p of FAVB_PLAYERS) {
      const nKey = normalizeNameKey(`${p.firstName} ${p.lastName}`);
      if (nKey) canonicalIdByName.set(nKey, p.id);
    }

    for (const row of censusRows) {
      const canonicalId = resolveCanonicalPlayerId(row.canonical_player_id || row.player_id);
      resolveBirthDateFromRow(row, canonicalId);

      const prev = canonicalInfoById.get(canonicalId);
      const isDemo =
        Boolean(row.is_demo) ||
        row.player_id.startsWith('demo-') ||
        row.player_id === 'p-test-prueba' ||
        Boolean(prev?.isDemo);

      canonicalInfoById.set(canonicalId, { isDemo });

      const nKey = normalizeNameKey(row.player_name);
      if (nKey && !canonicalIdByName.has(nKey)) {
        canonicalIdByName.set(nKey, canonicalId);
      }
    }

    const consentByCanonicalId = new Map<string, ConsentPrivacyRow>();
    const consentByName = new Map<string, ConsentPrivacyRow>();

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
        // Si colisionan dos IDs distintos (legado y canónico), priorizar denegación/revocación por precaución
        consentByCanonicalId.set(canonicalId, c);
      }
      const nKey = normalizeNameKey(c.player_name);
      if (nKey && !consentByName.has(nKey)) {
        consentByName.set(nKey, c);
      }
    }

    const sourcePlayers = teamId
      ? result.players.filter((p) => p.teamId === teamId)
      : result.players;

    const sanitizedPlayers: PublicSanitizedPlayer[] = [];

    for (const p of sourcePlayers) {
      if (p.id.startsWith('demo-') || p.id === 'p-test-prueba') {
        continue;
      }

      const isSlotPlaceholder = p.firstName === 'Jugador' || p.firstName === 'Jugadora';
      if (isSlotPlaceholder) {
        const { birthYear: _by, heightCm: _hc, ...rest } = p;
        sanitizedPlayers.push({
          ...rest,
          photoUrl: '/images/player-placeholder.svg',
          displayName: `${p.firstName} ${p.lastName}`.trim(),
        });
        continue;
      }

      const fullName = `${p.firstName} ${p.lastName}`.trim();
      const nameKey = normalizeNameKey(fullName);
      const canonicalId = resolveCanonicalPlayerId(
        canonicalIdByName.get(nameKey) || p.id
      );

      const censusInfo = canonicalInfoById.get(canonicalId);
      if (censusInfo?.isDemo) {
        continue;
      }

      const consent =
        consentByCanonicalId.get(canonicalId) ||
        consentByCanonicalId.get(p.id) ||
        consentByName.get(nameKey);

      const hasExplicitDenialOrRevocation = Boolean(
        consent && (consent.status !== 'ACTIVE' || consent.consent_social_media === false)
      );
      const hasActiveSocialConsent = Boolean(
        consent && consent.status === 'ACTIVE' && consent.consent_social_media === true
      );

      const canShowPhoto = hasActiveSocialConsent && !hasExplicitDenialOrRevocation;

      const { birthYear: _by, heightCm: _hc, ...rest } = p;
      const formattedName = formatPlayerNameWithInitials(p.firstName, p.lastName);

      sanitizedPlayers.push({
        ...rest,
        id: canonicalId,
        firstName: formattedName.firstName || p.firstName,
        lastName: formattedName.lastInitials,
        displayName: formattedName.displayName || `${p.firstName} ${p.lastName}`.trim(),
        photoUrl: canShowPhoto ? p.photoUrl || '/images/player-placeholder.svg' : '/images/player-placeholder.svg',
        isAnonymized: false,
      });
    }

    const filteredStaff = teamId
      ? result.staff.filter((s) => s.teamId === teamId)
      : result.staff;

    return NextResponse.json(
      {
        success: result.success,
        players: sanitizedPlayers,
        staff: filteredStaff,
        lastSync: result.lastSync.toISOString(),
        fromCache: result.fromCache,
        source: 'Federación Andaluza de Voleibol (favoley.net)',
      },
      { headers: noStoreHeaders }
    );
  } catch (error) {
    if (error instanceof NeonUnavailableError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Base de datos de privacidad temporalmente no disponible. No se pueden mostrar plantillas.',
        },
        { status: 503, headers: noStoreHeaders }
      );
    }

    console.error('[API /api/favb/rosters] Error al sincronizar plantillas:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'No se pudo obtener de forma segura el listado oficial de plantillas.',
      },
      { status: 503, headers: noStoreHeaders }
    );
  }
}
