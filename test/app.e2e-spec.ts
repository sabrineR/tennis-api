import request from 'supertest';
import { createTestApplication } from './helpers/test-database.ts';
import type { TestDatabaseContext } from './helpers/test-database.ts';

describe('AppController (e2e)', () => {
  let context: TestDatabaseContext | undefined;

  beforeAll(async () => {
    context = await createTestApplication();
  });

  it('/api (GET)', () => {
    if (!context) throw new Error('Test application is not initialized');
    return request(context.app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect('Hello World!');
  });

  afterAll(async () => {
    await context?.close();
  });
});
