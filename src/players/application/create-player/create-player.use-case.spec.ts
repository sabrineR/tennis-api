import type { CreatePlayerInput } from '../../domain/create-player-input.ts';
import { Player } from '../../domain/player.entity.ts';
import type { PlayerRepository } from '../../domain/player.repository.ts';
import { CreatePlayerUseCase } from './create-player.use-case.ts';

describe('CreatePlayerUseCase', () => {
  let repository: jest.Mocked<PlayerRepository>;
  let useCase: CreatePlayerUseCase;
  let input: CreatePlayerInput;
  let player: Player;

  beforeEach(() => {
    repository = {
      findAllOrderedByRank: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };
    useCase = new CreatePlayerUseCase(repository);
    input = {
      firstname: 'Test',
      lastname: 'Player',
      shortname: 'T. Player',
      sex: 'M',
      country: { picture: 'country.png', code: 'FRA' },
      picture: 'player.png',
      data: {
        rank: 1,
        points: 1000,
        weight: 80000,
        height: 185,
        age: 25,
        last: [1, 0, 1],
      },
    };
    player = new Player(
      52,
      input.firstname,
      input.lastname,
      input.shortname,
      input.sex,
      input.country,
      input.picture,
      input.data,
    );
  });

  it('calls create exactly once with the provided input', async () => {
    repository.create.mockResolvedValue(player);

    await useCase.execute(input);

    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(repository.create).toHaveBeenCalledWith(input);
  });

  it('returns the Player entity provided by the repository with its ID', async () => {
    repository.create.mockResolvedValue(player);

    const result = await useCase.execute(input);

    expect(result).toBe(player);
    expect(result.id).toBe(52);
  });

  it('propagates the error when the repository rejects creation', async () => {
    const error = new Error('Player creation failed');
    repository.create.mockRejectedValue(error);

    await expect(useCase.execute(input)).rejects.toBe(error);
  });
});
