import { NextResponse } from 'next/server';
import { getFastFavbMatchesSnapshot } from '@/lib/favb-scraper';
import { generateMultipleIcsContent, IcsEventInput } from '@/lib/date-utils';
import { isRestMatch } from '@/lib/match-utils';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawTeam = searchParams.get('team');
  const safeTeam = rawTeam ? rawTeam.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) : null;

  const snapshot = await getFastFavbMatchesSnapshot();
  let matches = snapshot.matches.filter((m) => !isRestMatch(m));

  if (safeTeam) {
    const queryLower = safeTeam.toLowerCase();
    const filtered = matches.filter(
      (m) =>
        (m.teamId || '').toLowerCase() === queryLower ||
        m.homeTeam.toLowerCase().includes(queryLower) ||
        m.awayTeam.toLowerCase().includes(queryLower)
    );
    if (filtered.length > 0) {
      matches = filtered;
    }
  }

  const events: IcsEventInput[] = matches.map((m) => ({
    title: `${m.homeTeam} vs ${m.awayTeam}`,
    venue: m.venue,
    startDateUtc: m.matchDate,
    matchId: m.id,
    durationMinutes: 120,
    description: `${m.categoryName} · Jornada ${m.round}. Partido oficial del C.D. Voleibol San Pedro.`,
  }));

  const icsBody = generateMultipleIcsContent(events);
  const filename = safeTeam
    ? `calendario-${safeTeam}.ics`
    : 'calendario-cdv-san-pedro.ics';

  return new NextResponse(icsBody, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Netlify-CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
