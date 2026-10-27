import { NextResponse } from 'next/server';
import { INITIAL_MATCHES } from '@/lib/data-store';
import { generateMultipleIcsContent, IcsEventInput } from '@/lib/date-utils';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawTeam = searchParams.get('team');
  const safeTeam = rawTeam ? rawTeam.replace(/[^a-zA-Z0-9_-]/g, '_') : null;

  let matches = INITIAL_MATCHES;
  if (safeTeam) {
    const filtered = INITIAL_MATCHES.filter(
      (m) =>
        m.teamId === safeTeam ||
        m.homeTeamName.toLowerCase().includes(safeTeam.toLowerCase()) ||
        m.awayTeamName.toLowerCase().includes(safeTeam.toLowerCase())
    );
    if (filtered.length > 0) {
      matches = filtered;
    }
  }

  const events: IcsEventInput[] = matches.map((m) => ({
    title: `${m.homeTeamName} vs ${m.awayTeamName}`,
    venue: m.venueName,
    startDateUtc: m.matchDate,
    matchId: m.id,
    durationMinutes: 120,
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
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
