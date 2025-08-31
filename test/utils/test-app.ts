import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from '../../src/app.module';
import fastifyCookie from '@fastify/cookie';

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());

  // mirror main.ts
  app.setGlobalPrefix('api');

  // HATA DÜZELTMESİ: Test uygulaması için cookie eklentisini kaydet
  await app.register(fastifyCookie, {
    secret: 'a-test-secret-for-cookies', // Test için bir secret belirleyebilirsiniz
  });

  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}
