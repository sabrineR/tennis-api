import type { ConfigService } from '@nestjs/config';
import type { Options } from 'sequelize';

export function createDatabaseOptions(config: ConfigService): Options {
  const required = (name: string): string => {
    const value = config.get<unknown>(name);
    if (typeof value !== 'string' || value.trim() === '') {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
  };

  const portValue = config.get<string>('DB_PORT') ?? '5432';
  const port = Number(portValue);
  if (
    !/^\d+$/.test(portValue) ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error('DB_PORT must be an integer between 1 and 65535');
  }

  const ssl = config.get<string>('DB_SSL') ?? 'false';
  if (ssl !== 'true' && ssl !== 'false') {
    throw new Error('DB_SSL must be true or false');
  }

  return {
    dialect: 'postgres',
    host: required('DB_HOST'),
    port,
    database: required('DB_NAME'),
    username: required('DB_USER'),
    password: required('DB_PASSWORD'),
    logging: false,
    pool: { max: 5, min: 0, acquire: 10000, idle: 10000 },
    dialectOptions: {
      connectionTimeoutMillis: 10000,
      ssl: ssl === 'true' ? { rejectUnauthorized: true } : false,
    },
  };
}
