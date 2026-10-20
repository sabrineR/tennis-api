import { Player } from '../../domain/player.entity.ts';
import type { PlayerRepository } from '../../domain/player.repository.ts';
import { ListPlayersUseCase } from './list-players.use-case.ts';

describe('ListPlayersUseCase', () => {
  let repository: jest.Mocked<PlayerRepository>;
  let useCase: ListPlayersUseCase;

  beforeEach(() => {
    repository = {
      findAllOrderedByRank: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };
    useCase = new ListPlayersUseCase(repository);
  });

  it('calls findAllOrderedByRank exactly once', async () => {
    repository.findAllOrderedByRank.mockResolvedValue([]);

    await useCase.execute();

    expect(repository.findAllOrderedByRank).toHaveBeenCalledTimes(1);
  });

  it('returns the players provided by the repository', async () => {
    const players = [
      new Player(
        1,
        'Test',
        'Player',
        'T. Player',
        'M',
        { picture: 'country.png', code: 'FRA' },
        'player.png',
        {
          rank: 1,
          points: 1000,
          weight: 80000,
          height: 185,
          age: 25,
          last: [1, 0, 1],
        },
      ),
    ];
    repository.findAllOrderedByRank.mockResolvedValue(players);

    const result = await useCase.execute();

    expect(result).toBe(players);
  });

  it('returns an empty array when the repository returns no players', async () => {
    repository.findAllOrderedByRank.mockResolvedValue([]);

    const result = await useCase.execute();

    expect(result).toEqual([]);
  });

  it('propagates the original technical error with its original cause', async () => {
    const cause = new Error('Connection failed');
    const error = new Error('Unable to retrieve players', { cause });
    repository.findAllOrderedByRank.mockRejectedValue(error);

    const result = useCase.execute();

    await expect(result).rejects.toBe(error);
    await expect(result).rejects.toHaveProperty('cause', cause);
  });
});
