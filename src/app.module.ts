import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller.ts';
import { AppService } from './app.service.ts';
import { PlayersModule } from './players/players.module.ts';
import { HttpExceptionFilter } from './shared/presentation/filters/http-exception.filter.ts';
import { StatsModule } from './stats/stats.module.ts';

@Module({
  imports: [PlayersModule, StatsModule],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
