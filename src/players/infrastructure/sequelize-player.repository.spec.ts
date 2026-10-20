import type { CreationAttributes } from 'sequelize';
import type { CreatePlayerInput } from '../domain/create-player-input.ts';
import { Player } from '../domain/player.entity.ts';
import { PlayerModel } from './player.model.ts';
import { SequelizePlayerRepository } from './sequelize-player.repository.ts';

describe('SequelizePlayerRepository', () => {
  let repository: SequelizePlayerRepository;
  let input: CreatePlayerInput;
  let attributes: Omit<CreationAttributes<PlayerModel>, 'id'>;
  let row: PlayerModel;

  beforeEach(() => {
    repository = new SequelizePlayerRepository(PlayerModel);
    input = {
      firstname: 'Test',
      lastname: 'Player',
      shortname: 'T. Player',
      sex: 'M',
      country: { code: 'FRA', picture: 'country.png' },
      picture: 'player.png',
      data: {
        rank: 2,
        points: 1000,
        weight: 80000,
        height: 185,
        age: 25,
        last: [1, 0, 1],
      },
    };
    attributes = {
      firstname: input.firstname,
      lastname: input.lastname,
      shortname: input.shortname,
      sex: input.sex,
      countryCode: input.country.code,
      countryPicture: input.country.picture,
      picture: input.picture,
      ...input.data,
      last: [...input.data.last],
    };
    // Only the attributes read by the repository are needed from the mocked row.
    row = { id: 103, ...attributes } as PlayerModel;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('requests rank ASC then id ASC and maps rows to domain entities', async () => {
    const findAll = jest.spyOn(PlayerModel, 'findAll').mockResolvedValue([row]);

    const result = await repository.findAllOrderedByRank();

    expect(findAll).toHaveBeenCalledTimes(1);
    expect(findAll).toHaveBeenCalledWith({
      order: [
        ['rank', 'ASC'],
        ['id', 'ASC'],
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(Player);
    expect(result[0]).toEqual({ id: 103, ...input });
    expect(result[0].getWinRatio()).toBe(2 / 3);
    expect(result[0].data.last).not.toBe(row.last);
    result[0].data.last.push(0);
    expect(row.last).toEqual([1, 0, 1]);
  });

  it('returns an empty list when no rows exist', async () => {
    jest.spyOn(PlayerModel, 'findAll').mockResolvedValue([]);

    await expect(repository.findAllOrderedByRank()).resolves.toEqual([]);
  });

  it('finds a player by primary key and returns a domain entity', async () => {
    const findByPk = jest.spyOn(PlayerModel, 'findByPk').mockResolvedValue(row);

    const result = await repository.findById(103);

    expect(findByPk).toHaveBeenCalledTimes(1);
    expect(findByPk).toHaveBeenCalledWith(103);
    expect(result).toBeInstanceOf(Player);
    expect(result).toEqual({ id: 103, ...input });
  });

  it('returns null when the player does not exist', async () => {
    jest.spyOn(PlayerModel, 'findByPk').mockResolvedValue(null);

    await expect(repository.findById(999)).resolves.toBeNull();
  });

  it('inserts flattened attributes without an ID and returns the generated ID', async () => {
    const create = jest.spyOn(PlayerModel, 'create').mockResolvedValue(row);

    const result = await repository.create(input);

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(attributes);
    expect(create.mock.calls[0][0]).not.toHaveProperty('id');
    expect(create.mock.calls[0][0]?.last).not.toBe(input.data.last);
    expect(result).toBeInstanceOf(Player);
    expect(result).toEqual({ id: 103, ...input });
    expect(input).not.toHaveProperty('id');
    create.mock.calls[0][0]?.last?.push(0);
    expect(input.data.last).toEqual([1, 0, 1]);
  });

  it('wraps list errors with an operation message and the original cause', async () => {
    const error = new Error('Read failed');
    jest.spyOn(PlayerModel, 'findAll').mockRejectedValue(error);

    await expect(repository.findAllOrderedByRank()).rejects.toMatchObject({
      message: 'Unable to retrieve players',
      cause: error,
    });
  });

  it('wraps lookup errors with their original cause instead of returning null', async () => {
    const error = new Error('Lookup failed');
    jest.spyOn(PlayerModel, 'findByPk').mockRejectedValue(error);

    await expect(repository.findById(103)).rejects.toMatchObject({
      message: 'Unable to retrieve player',
      cause: error,
    });
  });

  it('wraps creation errors with an operation message and the original cause', async () => {
    const error = new Error('Insert failed');
    jest.spyOn(PlayerModel, 'create').mockRejectedValue(error);

    await expect(repository.create(input)).rejects.toMatchObject({
      message: 'Unable to create player',
      cause: error,
    });
  });
});
