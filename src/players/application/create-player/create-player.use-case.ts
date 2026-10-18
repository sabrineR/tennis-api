import type { CreatePlayerInput } from '../../domain/create-player-input.ts';
import type { Player } from '../../domain/player.entity.ts';
import type { PlayerRepository } from '../../domain/player.repository.ts';

export class CreatePlayerUseCase {
  constructor(private readonly repository: PlayerRepository) {}

  async execute(input: CreatePlayerInput): Promise<Player> {
    return this.repository.create(input);
  }
}
