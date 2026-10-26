/**
 * Helpers para gestión de partidos y jornadas de descanso (liga con número impar de participantes).
 */

export function isRestMatch(match?: {
  homeTeamName?: string;
  awayTeamName?: string;
  homeTeam?: string;
  awayTeam?: string;
} | null): boolean {
  if (!match) return false;
  const isDescansa = (name?: string) => {
    if (!name) return false;
    const clean = name.toLowerCase().replace(/[\(\)\[\]\.\,\-]/g, '').trim();
    return clean === 'descansa' || clean.includes('descansa');
  };
  return (
    isDescansa(match.homeTeamName) ||
    isDescansa(match.awayTeamName) ||
    isDescansa(match.homeTeam) ||
    isDescansa(match.awayTeam)
  );
}
