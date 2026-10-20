import { Inject, Module } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Sequelize } from 'sequelize';
import { createDatabaseOptions } from './database.config.ts';

@Module({
  imports: [ConfigModule.forRoot({ ignoreEnvFile: process.env.NODE_ENV === 'test' })],
  providers: [
    {
      provide: Sequelize,
      inject: [ConfigService],
      useFactory: async (config: ConfigService): Promise<Sequelize> => {
        const sequelize = new Sequelize(createDatabaseOptions(config));
        try {
          await sequelize.authenticate();
          return sequelize;
        } catch (error) {
          await sequelize.close();
          throw error;
        }
      },
    },
  ],
  exports: [Sequelize],
})
export class DatabaseModule implements OnModuleDestroy {
  constructor(@Inject(Sequelize) private readonly sequelize: Sequelize) {}

  async onModuleDestroy(): Promise<void> {
    await this.sequelize.close();
  }
}
