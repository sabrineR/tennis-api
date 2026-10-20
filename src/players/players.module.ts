import { Module } from '@nestjs/common';
import { Sequelize } from 'sequelize';
import { DatabaseModule } from '../database/database.module.ts';
import { CreatePlayerUseCase } from './application/create-player/create-player.use-case.ts';
import { GetPlayerUseCase } from './application/get-player/get-player.use-case.ts';
import { ListPlayersUseCase } from './application/list-players/list-players.use-case.ts';
import type { PlayerRepository } from './domain/player.repository.ts';
import { PlayerModel } from './infrastructure/player.model.ts';
import { SequelizePlayerRepository } from './infrastructure/sequelize-player.repository.ts';
import { PLAYER_REPOSITORY } from './players.tokens.ts';
import { PlayersController } from './presentation/players.controller.ts';

@Module({
  imports: [DatabaseModule],
  controllers: [PlayersController],
  providers: [
    {
      provide: PlayerModel,
      inject: [Sequelize],
      useFactory: (sequelize: Sequelize): typeof PlayerModel => {
        const existing = sequelize.models.Player;
        if (existing) {
          return existing as typeof PlayerModel;
        }
        return PlayerModel.initialize(sequelize);
      },
    },
    {
      provide: PLAYER_REPOSITORY,
      inject: [PlayerModel],
      useFactory: (model: typeof PlayerModel): PlayerRepository =>
        new SequelizePlayerRepository(model),
    },
    {
      provide: ListPlayersUseCase,
      inject: [PLAYER_REPOSITORY],
      useFactory: (repository: PlayerRepository): ListPlayersUseCase =>
        new ListPlayersUseCase(repository),
    },
    {
      provide: GetPlayerUseCase,
      inject: [PLAYER_REPOSITORY],
      useFactory: (repository: PlayerRepository): GetPlayerUseCase =>
        new GetPlayerUseCase(repository),
    },
    {
      provide: CreatePlayerUseCase,
      inject: [PLAYER_REPOSITORY],
      useFactory: (repository: PlayerRepository): CreatePlayerUseCase =>
        new CreatePlayerUseCase(repository),
    },
  ],
  exports: [PLAYER_REPOSITORY],
})
export class PlayersModule {}
