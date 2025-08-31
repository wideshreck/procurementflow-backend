import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { patchNestJsSwagger } from 'nestjs-zod';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

async function generate() {
  patchNestJsSwagger();
  process.env.PRISMA_SKIP_CONNECT = 'true';
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Backend API')
    .setDescription('Auto-generated OpenAPI document')
    .setVersion('1.0.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
    .addCookieAuth('access_token', {
      type: 'apiKey',
      in: 'cookie',
      name: 'access_token',
      description: 'JWT set as HttpOnly cookie',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config, { deepScanRoutes: true });

  // Corrected output directory from 'openapi' to 'docs'
  const outDir = join(process.cwd(), 'docs');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'openapi.json'), JSON.stringify(document, null, 2));

  await app.close();
}

generate();