import { AppError } from '../../../shared/errors/app.error.ts';
import type { Player } from '../../domain/player.entity.ts';
import type { PlayerRepository } from '../../domain/player.repository.ts';

export class GetPlayerUseCase {
  constructor(private readonly repository: PlayerRepository) {}

  async execute(id: number): Promise<Player> {
    const player = await this.repository.findById(id);
    if (player === null) {
      throw new AppError('PLAYER_NOT_FOUND', `Player with ID ${id} not found`);
    }
    return player;
  }
}
