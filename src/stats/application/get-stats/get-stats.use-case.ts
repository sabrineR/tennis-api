import type { PlayerRepository } from '../../../players/domain/player.repository.ts';
import { calculatePlayerStatistics } from '../../domain/calculate-player-statistics.ts';
import type { PlayerStatistics } from '../../domain/player-statistics.ts';

export class GetStatsUseCase {
  constructor(private readonly repository: PlayerRepository) {}

  async execute(): Promise<PlayerStatistics> {
    const players = await this.repository.findAllOrderedByRank();
    return calculatePlayerStatistics(players);
  }
}
