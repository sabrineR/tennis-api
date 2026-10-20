import 'reflect-metadata';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Sequelize } from 'sequelize';
import { createDatabaseOptions } from './database.config.ts';
import { createMigrator } from './migrator.ts';

async function run(): Promise<void> {
  const action = process.argv[2];
  if (action !== 'up' && action !== 'down') {
    throw new Error('Expected migration action: up or down');
  }

  await ConfigModule.forRoot();
  const sequelize = new Sequelize(createDatabaseOptions(new ConfigService()));
  try {
    await sequelize.authenticate();
    const migrator = createMigrator(sequelize);
    if (action === 'up') {
      await migrator.up();
    } else {
      await migrator.down();
    }
  } finally {
    await sequelize.close();
  }
}

void run().catch((error: unknown) => {
  const name = error instanceof Error ? error.name : 'UnknownError';
  console.error(`Migration failed (${name}). Check database configuration and migration state.`);
  process.exitCode = 1;
});
