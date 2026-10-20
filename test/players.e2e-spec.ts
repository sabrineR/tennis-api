import { Logger } from '@nestjs/common';
import request from 'supertest';
import type { CreatePlayerInput } from '../src/players/domain/create-player-input.ts';
import type { PlayerRepository } from '../src/players/domain/player.repository.ts';
import { PLAYER_REPOSITORY } from '../src/players/players.tokens.ts';
import type { PlayerResponseDto } from '../src/players/presentation/dto/player-response.dto.ts';
import { createTestApplication } from './helpers/test-database.ts';
import type { TestDatabaseContext } from './helpers/test-database.ts';

type JsonObject = Record<string, unknown>;

function validPlayer(): CreatePlayerInput {
  return {
    firstname: 'Integration',
    lastname: 'Player',
    shortname: 'I.PLA',
    sex: 'F',
    country: { code: 'FRA', picture: 'https://example.com/france.png' },
    picture: 'https://example.com/player.png',
    data: {
      rank: 5,
      points: 100,
      weight: 70000,
      height: 175,
      age: 25,
      last: [1, 0, 1],
    },
  };
}

describe('Players HTTP integration', () => {
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

  async function postPlayer(payload: object): Promise<request.Response> {
    await context.assertIdentity();
    return request(context.app.getHttpServer())
      .post('/api/players')
      .send(payload);
  }

  async function expectInvalid(payload: object): Promise<void> {
    const response = await postPlayer(payload);
    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      statusCode: 400,
      code: 'HTTP_ERROR',
    });
    const list = await request(context.app.getHttpServer())
      .get('/api/players')
      .expect(200);
    expect(list.body).toEqual({ players: [] });
  }

  it('creates a player with a generated ID and retrieves the exact JSON', async () => {
    const input = validPlayer();
    const created = await postPlayer(input);
    expect(created.status).toBe(201);
    const player = created.body as PlayerResponseDto;
    expect(Number.isSafeInteger(player.id)).toBe(true);
    expect(player.id).toBeGreaterThan(0);
    expect(player).toEqual({ id: player.id, ...input });

    const list = await request(context.app.getHttpServer())
      .get('/api/players/')
      .expect(200);
    expect(list.body).toEqual({ players: [player] });
    const found = await request(context.app.getHttpServer())
      .get(`/api/players/${player.id}`)
      .expect(200);
    expect(found.body).toEqual(player);
  });

  it('generates distinct IDs and orders by rank ASC then id ASC', async () => {
    const players: PlayerResponseDto[] = [];
    for (const rank of [10, 2, 2]) {
      const input = validPlayer();
      input.data.rank = rank;
      const response = await postPlayer(input);
      expect(response.status).toBe(201);
      players.push(response.body as PlayerResponseDto);
    }
    expect(new Set(players.map((player) => player.id)).size).toBe(3);
    const response = await request(context.app.getHttpServer())
      .get('/api/players')
      .expect(200);
    expect(response.body).toEqual({
      players: [...players].sort(
        (a, b) => a.data.rank - b.data.rank || a.id - b.id,
      ),
    });
  });

  it.each([
    'firstname',
    'lastname',
    'shortname',
    'sex',
    'country',
    'picture',
    'data',
  ])('rejects missing %s', async (field) => {
    const input: JsonObject = { ...validPlayer() };
    delete input[field];
    await expectInvalid(input);
  });

  it.each(['picture', 'code'])('rejects missing country.%s', async (field) => {
    const input = validPlayer();
    const country: JsonObject = { ...input.country };
    delete country[field];
    await expectInvalid({ ...input, country });
  });

  it.each(['rank', 'points', 'weight', 'height', 'age', 'last'])(
    'rejects missing data.%s',
    async (field) => {
      const input = validPlayer();
      const data: JsonObject = { ...input.data };
      delete data[field];
      await expectInvalid({ ...input, data });
    },
  );

  it.each([
    ['firstname', '   '],
    ['lastname', 123],
    ['shortname', ''],
    ['sex', 'X'],
    ['picture', 'not-a-url'],
  ])('rejects invalid %s=%s', async (field, value) => {
    await expectInvalid({ ...validPlayer(), [field]: value });
  });

  it.each([
    ['rank', 0],
    ['rank', 1.5],
    ['points', -1],
    ['weight', -1],
    ['height', '175'],
    ['age', 0],
    ['last', [1, 2]],
    ['last', ['1']],
    ['last', null],
    ['rank', 2147483648],
  ])('rejects invalid data.%s=%s', async (field, value) => {
    const input = validPlayer();
    await expectInvalid({ ...input, data: { ...input.data, [field]: value } });
  });

  it.each([null, 'invalid', [], {}])(
    'rejects invalid country=%j',
    async (country) => {
      await expectInvalid({ ...validPlayer(), country });
    },
  );

  it.each([null, 'invalid', [], {}])(
    'rejects invalid data=%j',
    async (data) => {
      await expectInvalid({ ...validPlayer(), data });
    },
  );

  it('rejects invalid nested country fields', async () => {
    await expectInvalid({
      ...validPlayer(),
      country: { code: '', picture: 'not-a-url' },
    });
  });

  it.each(['id', 'unexpected'])(
    'rejects unknown root property %s',
    async (field) => {
      await expectInvalid({ ...validPlayer(), [field]: 52 });
    },
  );

  it.each(['country', 'data'] as const)(
    'rejects unknown nested %s properties',
    async (field) => {
      const input = validPlayer();
      await expectInvalid({
        ...input,
        [field]: { ...input[field], unexpected: true },
      });
    },
  );

  it('returns 404 for an absent player', async () => {
    const response = await request(context.app.getHttpServer())
      .get('/api/players/999')
      .expect(404);
    expect(response.body).toEqual({
      statusCode: 404,
      code: 'PLAYER_NOT_FOUND',
      message: 'Player with ID 999 not found',
    });
  });

  it.each(['abc', '0', '-1', '1.5'])(
    'rejects invalid route ID %s',
    async (id) => {
      await request(context.app.getHttpServer())
        .get(`/api/players/${id}`)
        .expect(400);
    },
  );

  it('hides technical details in HTTP 500 responses and logs', async () => {
    const repository = context.app.get<PlayerRepository>(PLAYER_REPOSITORY);
    const cause = new Error(
      'SELECT secret_column; password=FAKE_PASSWORD; host=FAKE_HOST',
    );
    const error = new Error('FAKE_TECHNICAL_DETAIL', { cause });
    const create = jest
      .spyOn(repository, 'create')
      .mockRejectedValueOnce(error);
    const logger = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    try {
      const response = await postPlayer(validPlayer());
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        statusCode: 500,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Internal server error',
      });
      expect(create).toHaveBeenCalledTimes(1);
      expect(logger).toHaveBeenCalled();
      const output = JSON.stringify({
        body: response.body,
        logs: logger.mock.calls,
      });
      for (const sensitive of [
        'FAKE_PASSWORD',
        'FAKE_HOST',
        'FAKE_TECHNICAL_DETAIL',
        'SELECT secret_column',
      ]) {
        expect(output).not.toContain(sensitive);
      }
      const list = await request(context.app.getHttpServer())
        .get('/api/players')
        .expect(200);
      expect(list.body).toEqual({ players: [] });
    } finally {
      create.mockRestore();
      logger.mockRestore();
    }
  });
});
