import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import type { App } from 'supertest/types';
import { QueryTypes, Sequelize } from 'sequelize';
import { createMigrator } from '../../src/database/migrator.ts';
import { configureHttp } from '../../src/shared/presentation/configure-http.ts';

export interface TestDatabaseContext {
  app: INestApplication<App>;
  assertIdentity(): Promise<void>;
  reset(): Promise<void>;
  close(): Promise<void>;
}

export async function createTestApplication(): Promise<TestDatabaseContext> {
  const file = resolve(process.cwd(), '.env.test');
  const settings: Record<string, string | undefined> = existsSync(file)
    ? parseEnv(readFileSync(file, 'utf8'))
    : {};
  const portText = process.env.TEST_DB_PORT ?? settings.TEST_DB_PORT ?? '25432';
  const password = process.env.TEST_DB_PASSWORD ?? settings.TEST_DB_PASSWORD;
  const port = Number(portText);
  if (
    !/^\d+$/.test(portText) ||
    !Number.isInteger(port) ||
    port < 1024 ||
    port > 65535 ||
    [5432, 5433, 15432].includes(port)
  ) {
    throw new Error(
      'Unsafe test port: use a dedicated port, distinct from existing PostgreSQL instances.',
    );
  }
  if (!password || password === 'replace-with-a-test-only-password') {
    throw new Error(
      'Set a test-only TEST_DB_PASSWORD in .env.test or the process environment.',
    );
  }

  const environment: Record<string, string> = {
    NODE_ENV: 'test',
    DB_HOST: '127.0.0.1',
    DB_PORT: String(port),
    DB_NAME: 'tennis_test',
    DB_USER: 'tennis_test',
    DB_PASSWORD: password,
    DB_SSL: 'false',
  };
  const previous = new Map(
    Object.keys(environment).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, environment);
  const restoreEnvironment = (): void => {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };

  const sequelize = new Sequelize({
    dialect: 'postgres',
    host: '127.0.0.1',
    port,
    database: 'tennis_test',
    username: 'tennis_test',
    password,
    logging: false,
    pool: { max: 2, min: 0, acquire: 10000, idle: 1000 },
    dialectOptions: { connectionTimeoutMillis: 10000, ssl: false },
  });
  let app: INestApplication<App> | undefined;
  let moduleFixture: TestingModule | undefined;

  const assertIdentity = async (): Promise<void> => {
    const identity = await sequelize.query<{
      database: string;
      username: string;
      port: number;
    }>(
      'SELECT current_database() AS database, current_user AS username, inet_server_port() AS port',
      { type: QueryTypes.SELECT },
    );
    if (
      identity.length !== 1 ||
      identity[0].database !== 'tennis_test' ||
      identity[0].username !== 'tennis_test' ||
      identity[0].port !== 5432
    ) {
      throw new Error('Unsafe database identity: test operations refused.');
    }
    for (const [key, value] of Object.entries(environment)) {
      if (process.env[key] !== value)
        throw new Error(
          'Test database environment changed; operations refused.',
        );
    }
  };

  const close = async (): Promise<void> => {
    try {
      if (app) await app.close();
      else if (moduleFixture) await moduleFixture.close();
    } finally {
      try {
        await sequelize.close();
      } finally {
        restoreEnvironment();
      }
    }
  };

  try {
    await sequelize.authenticate();
    await assertIdentity();
    await createMigrator(sequelize).up();
    // Import only after the test environment is fixed; never load development .env.
    const { AppModule } = await import('../../src/app.module.ts');
    moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(Sequelize)
      .useValue(sequelize)
      .compile();
    app = moduleFixture.createNestApplication<INestApplication<App>>();
    configureHttp(app);
    await app.init();
    await assertIdentity();
    return {
      app,
      assertIdentity,
      reset: async (): Promise<void> => {
        await assertIdentity();
        await sequelize.query('DELETE FROM "players"');
      },
      close,
    };
  } catch (error) {
    try {
      await close();
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        'Test initialization and cleanup failed.',
      );
    }
    throw error;
  }
}
