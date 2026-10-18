import type { Player } from '../../domain/player.entity.ts';
import type { PlayerRepository } from '../../domain/player.repository.ts';

export class ListPlayersUseCase {
  constructor(private readonly repository: PlayerRepository) {}

  async execute(): Promise<Player[]> {
    return this.repository.findAllOrderedByRank();
  }
}
