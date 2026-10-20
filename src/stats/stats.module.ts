import { Module } from '@nestjs/common';
import type { PlayerRepository } from '../players/domain/player.repository.ts';
import { PlayersModule } from '../players/players.module.ts';
import { PLAYER_REPOSITORY } from '../players/players.tokens.ts';
import { GetStatsUseCase } from './application/get-stats/get-stats.use-case.ts';
import { StatsController } from './presentation/stats.controller.ts';

@Module({
  imports: [PlayersModule],
  controllers: [StatsController],
  providers: [
    {
      provide: GetStatsUseCase,
      inject: [PLAYER_REPOSITORY],
      useFactory: (repository: PlayerRepository): GetStatsUseCase =>
        new GetStatsUseCase(repository),
    },
  ],
})
export class StatsModule {}
