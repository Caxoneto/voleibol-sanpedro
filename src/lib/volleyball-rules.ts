import { SetScore } from './types';

export interface MatchScoreResult {
  homeSetsWon: number;
  awaySetsWon: number;
  homePoints: number;
  awayPoints: number;
  isHomeWinner: boolean;
  totalSets: number;
  formattedScore: string;
}

/**
 * Calcula el desglose oficial de voleibol según sets ganados:
 * - Victoria 3-0 o 3-1 -> 3 puntos al ganador, 0 al perdedor
 * - Victoria 3-2       -> 2 puntos al ganador, 1 al perdedor
 * - Derrota 2-3        -> 1 punto al perdedor, 2 al ganador
 * - Derrota 0-3 o 1-3  -> 0 puntos al perdedor, 3 al ganador
 */
export function calculateMatchScore(setScores: SetScore[]): MatchScoreResult {
  let homeSetsWon = 0;
  let awaySetsWon = 0;

  for (const set of setScores) {
    if (set.home > set.away) {
      homeSetsWon++;
    } else if (set.away > set.home) {
      awaySetsWon++;
    }
  }

  const isHomeWinner = homeSetsWon > awaySetsWon;
  let homePoints = 0;
  let awayPoints = 0;

  if (homeSetsWon >= 3 || awaySetsWon >= 3) {
    if (isHomeWinner) {
      if (awaySetsWon === 2) {
        homePoints = 2;
        awayPoints = 1;
      } else {
        homePoints = 3;
        awayPoints = 0;
      }
    } else {
      if (homeSetsWon === 2) {
        awayPoints = 2;
        homePoints = 1;
      } else {
        awayPoints = 3;
        homePoints = 0;
      }
    }
  }

  return {
    homeSetsWon,
    awaySetsWon,
    homePoints,
    awayPoints,
    isHomeWinner,
    totalSets: homeSetsWon + awaySetsWon,
    formattedScore: `${homeSetsWon} - ${awaySetsWon}`,
  };
}
