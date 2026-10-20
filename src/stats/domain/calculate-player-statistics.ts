import type { Player } from '../../players/domain/player.entity.ts';
import type { PlayerStatistics } from './player-statistics.ts';

export function calculatePlayerStatistics(players: readonly Player[]): PlayerStatistics {
  if (players.length === 0) {
    return { bestCountry: null, averageBmi: null, medianHeightCm: null };
  }

  const countries = new Map<string, { wins: number; matches: number }>();
  const heights: number[] = [];
  let totalBmi = 0;

  for (const player of players) {
    const country = countries.get(player.country.code) ?? { wins: 0, matches: 0 };
    country.wins += player.data.last.filter((result) => result === 1).length;
    country.matches += player.data.last.length;
    countries.set(player.country.code, country);
    const heightMetres = player.data.height / 100;
    totalBmi += (player.data.weight / 1000) / (heightMetres * heightMetres);
    heights.push(player.data.height);
  }

  let best: { code: string; wins: number; matches: number } | null = null;
  for (const [code, country] of countries) {
    if (country.matches === 0) continue;
    // Compare fractions before dividing: equal ratios keep an alphabetical tie-break.
    const comparison = best ? country.wins * best.matches - best.wins * country.matches : 0;
    if (best === null || comparison > 0 || (comparison === 0 && code < best.code)) {
      best = { code, ...country };
    }
  }

  heights.sort((a, b) => a - b);
  const middle = Math.floor(heights.length / 2);
  const median = heights.length % 2 === 0
    ? (heights[middle - 1] + heights[middle]) / 2
    : heights[middle];

  return {
    bestCountry: best ? { code: best.code, winRatio: best.wins / best.matches } : null,
    averageBmi: totalBmi / players.length,
    medianHeightCm: median,
  };
}
