import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Logger } from '@nestjs/common';
import request from 'supertest';
import type { CreatePlayerInput } from '../src/players/domain/create-player-input.ts';
import type { PlayerRepository } from '../src/players/domain/player.repository.ts';
import { PLAYER_REPOSITORY } from '../src/players/players.tokens.ts';
import { createTestApplication } from './helpers/test-database.ts';
import type { TestDatabaseContext } from './helpers/test-database.ts';

function input(
  code: string,
  last: (0 | 1)[],
  height = 200,
  weight = 80000,
): CreatePlayerInput {
  return {
    firstname: 'Statistics',
    lastname: 'Player',
    shortname: 'S.PLA',
    sex: 'M',
    country: { code, picture: 'https://example.com/country.png' },
    picture: 'https://example.com/player.png',
    data: { rank: 1, points: 100, height, weight, age: 25, last },
  };
}

describe('Stats HTTP integration', () => {
  let context: TestDatabaseContext;

  beforeAll(async () => {
    context = await createTestApplication();
  });
  beforeEach(async () => {
    await context.reset();
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });
  afterAll(async () => {
    if (context) await context.close();
  });

  async function createPlayer(player: CreatePlayerInput): Promise<void> {
    await context.assertIdentity();
    await request(context.app.getHttpServer())
      .post('/api/players')
      .send(player)
      .expect(201);
  }

  it('returns null statistics for an empty database', async () => {
    const response = await request(context.app.getHttpServer())
      .get('/api/stats')
      .expect(200);
    expect(response.body).toEqual({
      bestCountry: null,
      averageBmi: null,
      medianHeightCm: null,
    });
  });

  it('calculates the original five players without importing their original IDs', async () => {
    const source = JSON.parse(
      readFileSync(resolve('src/database/seeders/players.json'), 'utf8'),
    ) as {
      players: (CreatePlayerInput & { id: number })[];
    };
    for (const { id: originalId, ...player } of source.players) {
      expect(originalId).toBeGreaterThan(0);
      await createPlayer(player);
    }
    const response = await request(context.app.getHttpServer())
      .get('/api/stats')
      .expect(200);
    expect(response.body).toEqual({
      bestCountry: { code: 'SRB', winRatio: 1 },
      averageBmi: 23.36,
      medianHeightCm: 185,
    });
  });

  it('uses aggregated country wins and matches', async () => {
    await createPlayer(input('AAA', [1]));
    await createPlayer(input('AAA', [0, 0, 0]));
    await createPlayer(input('BBB', [1, 0, 0]));
    const response = await request(context.app.getHttpServer())
      .get('/api/stats')
      .expect(200);
    expect(response.body.bestCountry).toEqual({
      code: 'BBB',
      winRatio: 0.3333,
    });
  });

  it('rounds BMI only in HTTP and calculates an even-sized median', async () => {
    await createPlayer(input('FRA', [1, 0, 0], 188, 80000));
    await createPlayer(input('FRA', [], 175, 72000));
    const response = await request(context.app.getHttpServer())
      .get('/api/stats')
      .expect(200);
    expect(response.body).toEqual({
      bestCountry: { code: 'FRA', winRatio: 0.3333 },
      averageBmi: Number(
        ((80 / (1.88 * 1.88) + 72 / (1.75 * 1.75)) / 2).toFixed(2),
      ),
      medianHeightCm: 181.5,
    });
  });

  it('keeps BMI and median when no matches exist', async () => {
    await createPlayer(input('FRA', []));
    const response = await request(context.app.getHttpServer())
      .get('/api/stats')
      .expect(200);
    expect(response.body).toEqual({
      bestCountry: null,
      averageBmi: 20,
      medianHeightCm: 200,
    });
  });

  it('breaks country ties alphabetically', async () => {
    await createPlayer(input('USA', [1, 0]));
    await createPlayer(input('ESP', [1, 1, 0, 0]));
    const response = await request(context.app.getHttpServer())
      .get('/api/stats')
      .expect(200);
    expect(response.body.bestCountry).toEqual({ code: 'ESP', winRatio: 0.5 });
  });

  it('returns a safe HTTP 500 for a technical repository error', async () => {
    const repository = context.app.get<PlayerRepository>(PLAYER_REPOSITORY);
    const cause = new Error('SELECT FAKE_SQL; password=FAKE_SECRET');
    const read = jest
      .spyOn(repository, 'findAllOrderedByRank')
      .mockRejectedValueOnce(new Error('FAKE_TECHNICAL_MESSAGE', { cause }));
    const logger = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    try {
      const response = await request(context.app.getHttpServer())
        .get('/api/stats')
        .expect(500);
      expect(response.body).toEqual({
        statusCode: 500,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      });
      expect(read).toHaveBeenCalledTimes(1);
      const output = JSON.stringify({
        body: response.body,
        logs: logger.mock.calls,
      });
      for (const secret of [
        'FAKE_SQL',
        'FAKE_SECRET',
        'FAKE_TECHNICAL_MESSAGE',
      ]) {
        expect(output).not.toContain(secret);
      }
    } finally {
      read.mockRestore();
      logger.mockRestore();
    }
  });
});
