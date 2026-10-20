import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function configureSwagger(app: INestApplication): void {
  const configuration = new DocumentBuilder()
    .setTitle('Tennis API')
    .setDescription(
      'Tennis players and statistics. POST /api/players via Try it out creates a real player in the connected database. Unknown request properties are rejected.',
    )
    .setVersion('1.0.0')
    .build();
  const document = SwaggerModule.createDocument(app, configuration, {
    ignoreGlobalPrefix: false,
  });
  SwaggerModule.setup('api/docs', app, document, {
    useGlobalPrefix: false,
    jsonDocumentUrl: 'api/docs-json',
    swaggerOptions: { supportedSubmitMethods: ['get', 'post'] },
  });
}
