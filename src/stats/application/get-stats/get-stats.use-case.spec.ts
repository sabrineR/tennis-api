import { Player } from '../../../players/domain/player.entity.ts';
import type { PlayerRepository } from '../../../players/domain/player.repository.ts';
import { GetStatsUseCase } from './get-stats.use-case.ts';

describe('GetStatsUseCase', () => {
  let repository: jest.Mocked<PlayerRepository>;
  let useCase: GetStatsUseCase;

  beforeEach(() => {
    repository = {
      findAllOrderedByRank: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };
    useCase = new GetStatsUseCase(repository);
  });

  it('reads the players exactly once and returns their calculated statistics', async () => {
    repository.findAllOrderedByRank.mockResolvedValue([
      new Player(
        1,
        'Test',
        'Player',
        'T.PLA',
        'M',
        { code: 'FRA', picture: 'country.png' },
        'player.png',
        {
          rank: 1,
          points: 100,
          weight: 80000,
          height: 200,
          age: 25,
          last: [1, 0, 0],
        },
      ),
    ]);
    await expect(useCase.execute()).resolves.toEqual({
      bestCountry: { code: 'FRA', winRatio: 1 / 3 },
      averageBmi: 20,
      medianHeightCm: 200,
    });
    expect(repository.findAllOrderedByRank).toHaveBeenCalledTimes(1);
    expect(repository.findAllOrderedByRank).toHaveBeenCalledWith();
  });

  it('returns null statistics for an empty repository', async () => {
    repository.findAllOrderedByRank.mockResolvedValue([]);
    await expect(useCase.execute()).resolves.toEqual({
      bestCountry: null,
      averageBmi: null,
      medianHeightCm: null,
    });
  });

  it('propagates technical errors without replacing them or their cause', async () => {
    const cause = new Error('Connection failed');
    const error = new Error('Unable to retrieve players', { cause });
    repository.findAllOrderedByRank.mockRejectedValue(error);
    const result = useCase.execute();
    await expect(result).rejects.toBe(error);
    await expect(result).rejects.toHaveProperty('cause', cause);
  });
});
