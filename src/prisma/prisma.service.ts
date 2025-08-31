// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

type PrismaWithQueryEvent = {
  $on(event: 'query', cb: (e: Prisma.QueryEvent) => void): void;
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Log ayarlarını ortam değişkenlerine göre derle
    const enableInfo = process.env.PRISMA_LOG === 'true';
    const enableQueryEvent = process.env.PRISMA_LOG_QUERIES === 'true';

    const log: (Prisma.LogLevel | Prisma.LogDefinition)[] = ['warn', 'error'];
    if (enableInfo) log.push('info');
    if (enableQueryEvent) log.push({ level: 'query', emit: 'event' } as Prisma.LogDefinition);

    super({
      errorFormat: process.env.NODE_ENV === 'production' ? 'minimal' : 'pretty',
      log,
      datasources: process.env.DATABASE_URL ? { db: { url: process.env.DATABASE_URL } } : undefined,
    });

    // TypeScript: Prisma, query event'ini ancak log seçeneklerinde type-level garanti verilirse etkinleştirir.
    // Biz koşullu olduğumuz için burada daraltılmış bir arayüze cast ederek kullanıyoruz.
    if (enableQueryEvent) {
      (this as unknown as PrismaWithQueryEvent).$on('query', (e) => {
        this.logger.debug(`[Prisma][Query] ${e.query} ${e.params} +${e.duration}ms`);
      });
    }
  }

  async onModuleInit(): Promise<void> {
    if (process.env.PRISMA_SKIP_CONNECT === 'true') {
      this.logger.log('Prisma connection skipped');
    } else {
      try {
        await this.$connect();
        this.logger.log('Prisma connected');
      } catch (error) {
        this.logger.error('Prisma connection failed', error as Error);
      }
    }
    this.registerMiddlewares();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Prisma disconnected');
  }

  /**
   * Servis katmanında temiz kullanım:
   * await this.prisma.withTransaction(async (tx) => { ... });
   */
  async withTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.$transaction(async (tx) => fn(tx));
  }

  /**
   * Global Prisma middlewares (audit, soft-delete, multi-tenancy vs.)
   * Gerekirse burada tek noktadan yönet.
   */
  private registerMiddlewares(): void {
    // Örnek (pasif):
    // this.$use(async (params, next) => {
    //   // custom logic...
    //   return next(params);
    // });
  }
}
