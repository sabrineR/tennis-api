import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Player } from '../../players/domain/player.entity.ts';
import type { PlayerData } from '../../players/domain/player.ts';
import { calculatePlayerStatistics } from './calculate-player-statistics.ts';

function player(code = 'FRA', data: Partial<PlayerData> = {}): Player {
  return new Player(1, 'Test', 'Player', 'T.PLA', 'M',
    { code, picture: 'country.png' }, 'player.png', {
      rank: 1, points: 100, weight: 80000, height: 200, age: 25, last: [1], ...data,
    });
}

describe('calculatePlayerStatistics', () => {
  it('returns null statistics for no players', () => {
    expect(calculatePlayerStatistics([])).toEqual({
      bestCountry: null, averageBmi: null, medianHeightCm: null,
    });
  });

  it('aggregates wins and matches per country instead of averaging player ratios', () => {
    const result = calculatePlayerStatistics([
      player('AAA', { last: [1] }),
      player('AAA', { last: [0, 0, 0] }),
      player('BBB', { last: [1, 0, 0] }),
    ]);
    expect(result.bestCountry).toEqual({ code: 'BBB', winRatio: 1 / 3 });
  });

  it('ignores countries with no matches', () => {
    expect(calculatePlayerStatistics([
      player('AAA', { last: [] }), player('BBB', { last: [0] }),
    ]).bestCountry).toEqual({ code: 'BBB', winRatio: 0 });
  });

  it('still calculates BMI and height when no player has matches', () => {
    expect(calculatePlayerStatistics([player('FRA', { last: [] })])).toEqual({
      bestCountry: null, averageBmi: 20, medianHeightCm: 200,
    });
  });

  it.each([false, true])('breaks equal ratios alphabetically regardless of input order (%s)', (reverse) => {
    const players = [player('USA', { last: [1, 0] }), player('ESP', { last: [1, 1, 0, 0] })];
    expect(calculatePlayerStatistics(reverse ? [...players].reverse() : players).bestCountry)
      .toEqual({ code: 'ESP', winRatio: 0.5 });
  });

  it('converts grams and centimetres and averages individual BMIs', () => {
    expect(calculatePlayerStatistics([
      player('FRA', { weight: 80000, height: 200 }),
      player('FRA', { weight: 90000, height: 150 }),
    ]).averageBmi).toBe(30);
  });

  it('does not round BMI or ratios in business calculations', () => {
    const result = calculatePlayerStatistics([player('FRA', { height: 188, last: [1, 0, 0] })]);
    expect(result.averageBmi).toBe(80 / (1.88 * 1.88));
    expect(result.bestCountry?.winRatio).toBe(1 / 3);
  });

  it.each<[number[], number]>([
    [[185], 185],
    [[190, 170, 180], 180],
    [[190, 170], 180],
    [[190, 170, 180, 181], 180.5],
  ])('calculates the median of %j', (heights, expected) => {
    expect(calculatePlayerStatistics(heights.map((height) => player('FRA', { height }))).medianHeightCm)
      .toBe(expected);
  });

  it('does not mutate the player list or nested data', () => {
    const players = [player('USA', { height: 200 }), player('FRA', { height: 175 })];
    const before = JSON.stringify(players);
    for (const entry of players) {
      Object.freeze(entry.data.last);
      Object.freeze(entry.data);
      Object.freeze(entry.country);
      Object.freeze(entry);
    }
    Object.freeze(players);
    calculatePlayerStatistics(players);
    expect(JSON.stringify(players)).toBe(before);
  });

  it('calculates the exact results from the five original players', () => {
    const source = JSON.parse(readFileSync(resolve('src/database/seeders/players.json'), 'utf8')) as {
      players: Player[];
    };
    const result = calculatePlayerStatistics(source.players);
    expect(result.bestCountry).toEqual({ code: 'SRB', winRatio: 1 });
    expect(result.averageBmi).toBeCloseTo(23.357838995505837, 12);
    expect(result.medianHeightCm).toBe(185);
  });
});
