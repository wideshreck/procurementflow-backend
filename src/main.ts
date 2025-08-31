import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { patchNestJsSwagger } from 'nestjs-zod';
import { AppModule } from './app.module';

import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import { fastify } from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyCookie from '@fastify/cookie';

async function bootstrap() {
  patchNestJsSwagger();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      logger: false,
      trustProxy: process.env.NODE_ENV === 'production',
    }),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  // --- Security Middlewares ---
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'img-src': ["'self'", 'data:', 'https:'],
        'script-src': ["'self'", "'unsafe-inline'"],
        'style-src': ["'self'", 'https:', "'unsafe-inline'"],
      },
    },
  });

  // Cookie eklentisini kaydet
  await app.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET || 'a-secure-secret-for-cookie-signing',
  });

  // Empty body handler for specific endpoints
  await app.register(async function (fastify) {
    fastify.addContentTypeParser('application/json', { parseAs: 'string' }, function (req, body, done) {
      try {
        const json = body === '' ? {} : JSON.parse(body as string);
        done(null, json);
      } catch (err) {
        err.statusCode = 400;
        done(err, undefined);
      }
    });
  });

  // CORS Configuration - Fastify CORS plugin kullan
  await app.register(fastifyCors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With', 
      'Content-Type', 
      'Accept', 
      'Authorization', 
      'X-CSRF-Token',
      'X-Csrf-Token'
    ],
    maxAge: 86400, // 24 hours
  });


  // Rate limit
  await app.register(fastifyRateLimit, {
    max: Number(process.env.RATE_LIMIT_MAX ?? 100),
    timeWindow: process.env.RATE_LIMIT_WINDOW ?? '15 minutes',
    keyGenerator: (req) =>
      (req.headers['x-forwarded-for'] as string) || req.ip,
  });

  // --- Swagger ---
  if (process.env.SWAGGER_ENABLED === 'true') {
    const config = new DocumentBuilder()
      .setTitle('ProcurementFlow API')
      .setDescription('NestJS + Fastify + Zod + Prisma starter API')
      .setVersion('1.0.0')
      .addServer('/', 'Default server')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
        'access-token',
      )
      .addCookieAuth('refresh_token', {
        type: 'apiKey',
        in: 'cookie',
        name: 'refresh_token',
      })
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      deepScanRoutes: true,
    });

    SwaggerModule.setup('api/docs', app, document, {
      jsonDocumentUrl: 'api/docs-json',
      customSiteTitle: 'ProcurementFlow API Docs',
    });
  }

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
