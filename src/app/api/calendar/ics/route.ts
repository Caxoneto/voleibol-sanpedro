import { NextResponse } from 'next/server';
import { INITIAL_MATCHES } from '@/lib/data-store';
import { generateIcsContent } from '@/lib/date-utils';

export async function GET() {
  const events = INITIAL_MATCHES.map((m) =>
    generateIcsContent(
      `${m.homeTeamName} vs ${m.awayTeamName}`,
      m.venueName,
      m.matchDate,
      m.id
    )
  ).join('\r\n');

  return new NextResponse(events, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="calendario-cdv-san-pedro.ics"',
      'Cache-Control': 'no-cache',
    },
  });
}
