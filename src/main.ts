import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.ts';
import { configureHttp } from './shared/presentation/configure-http.ts';
import { configureSwagger } from './shared/presentation/configure-swagger.ts';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  try {
    configureHttp(app);
    configureSwagger(app);
    app.enableShutdownHooks();
    await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
  } catch (error) {
    await app.close();
    throw error;
  }
}
void bootstrap().catch(() => {
  Logger.error('Application startup failed', 'Bootstrap');
  process.exitCode = 1;
});
