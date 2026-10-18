import type { Player } from '../../domain/player.entity.ts';
import type { PlayerRepository } from '../../domain/player.repository.ts';

export class GetPlayerUseCase {
  constructor(private readonly repository: PlayerRepository) {}

  async execute(id: number): Promise<Player | null> {
    return this.repository.findById(id);
  }
}
