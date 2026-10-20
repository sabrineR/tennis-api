import 'reflect-metadata';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Sequelize } from 'sequelize';
import type { CreatePlayerInput } from '../../players/domain/create-player-input.ts';
import { PlayerMapper } from '../../players/infrastructure/player.mapper.ts';
import { PlayerModel } from '../../players/infrastructure/player.model.ts';
import { createDatabaseOptions } from '../database.config.ts';

type SeedPlayer = CreatePlayerInput & { id: number };

async function seedPlayers(): Promise<void> {
  await ConfigModule.forRoot();
  const sequelize = new Sequelize(createDatabaseOptions(new ConfigService()));
  const failures: unknown[] = [];

  try {
    const content = await readFile(join(__dirname, 'players.json'), 'utf8');
    const { players } = JSON.parse(content) as { players: SeedPlayer[] };
    const rows = players.map((player) => ({
      ...PlayerMapper.toPersistence(player),
      id: player.id,
    }));

    await sequelize.authenticate();
    PlayerModel.initialize(sequelize);

    await sequelize.transaction(async (transaction) => {
      // Serialize seeds and block concurrent inserts while aligning the sequence.
      await sequelize.query(
        'LOCK TABLE "players" IN SHARE ROW EXCLUSIVE MODE',
        {
          transaction,
        },
      );
      await PlayerModel.bulkCreate(rows, {
        ignoreDuplicates: true,
        transaction,
      });
      // Never move the sequence backwards, including after deleted rows or rollbacks.
      await sequelize.query(
        `SELECT setval(
          pg_get_serial_sequence('players', 'id'),
          GREATEST(
            (SELECT COALESCE(MAX(id), 1) FROM "players"),
            (SELECT last_value FROM "players_id_seq")
          ),
          true
        )`,
        { transaction },
      );
    });
  } catch (error) {
    failures.push(
      new Error('Unable to seed players; existing rows are not overwritten.', {
        cause: error,
      }),
    );
  } finally {
    try {
      await sequelize.close();
    } catch (error) {
      failures.push(
        new Error('Unable to close the seed database connection.', {
          cause: error,
        }),
      );
    }
  }

  if (failures.length === 1) {
    throw failures[0];
  }
  if (failures.length > 1) {
    throw new AggregateError(
      failures,
      'Player seed and connection cleanup failed.',
    );
  }
  console.info(
    'Player seed completed; existing IDs were preserved and the sequence aligned.',
  );
}

void seedPlayers().catch((error: unknown) => {
  // Keep the cause on the error without printing SQL or connection credentials.
  console.error(
    error instanceof Error ? error.message : 'Unexpected player seed failure.',
  );
  process.exitCode = 1;
});
