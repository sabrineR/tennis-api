import { Player } from '../../domain/player.entity.ts';
import type { PlayerRepository } from '../../domain/player.repository.ts';
import { GetPlayerUseCase } from './get-player.use-case.ts';

describe('GetPlayerUseCase', () => {
  let repository: jest.Mocked<PlayerRepository>;
  let useCase: GetPlayerUseCase;

  beforeEach(() => {
    repository = {
      findAllOrderedByRank: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
    };
    useCase = new GetPlayerUseCase(repository);
  });

  it('returns the player when the repository finds ID 52', async () => {
    const player = new Player(
      52,
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
    );
    repository.findById.mockResolvedValue(player);

    const result = await useCase.execute(52);

    expect(result).toBe(player);
  });

  it('returns null when player 999 does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    const result = await useCase.execute(999);

    expect(result).toBeNull();
  });

  it('calls findById exactly once with the provided ID', async () => {
    repository.findById.mockResolvedValue(null);

    await useCase.execute(52);

    expect(repository.findById).toHaveBeenCalledTimes(1);
    expect(repository.findById).toHaveBeenCalledWith(52);
  });
});
