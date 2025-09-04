import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { envSchema, Env } from './config/environment';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { HealthModule } from './modules/health/health.module';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { JwtAuthGuard } from './modules/auth/guards/jwt.guard';
import { CsrfGuard } from './modules/auth/guards/csrf.guard';
import { SecurityHeadersInterceptor } from './modules/auth/interceptors/security-headers.interceptor';
import { ProcurementModule } from './modules/procurement/procurement.module';
import { LocationsModule } from './modules/locations/locations.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { CostCentersModule } from './modules/cost-centers/cost-centers.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { FilesModule } from './modules/files/files.module';
import { CustomRolesModule } from './modules/custom-roles/custom-roles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (env) => envSchema.parse(env),
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) => ({
        pinoHttp: {
          level: configService.get('NODE_ENV') === 'production' ? 'info' : 'debug',
          transport:
            configService.get('NODE_ENV') !== 'production'
              ? {
                  target: 'pino-pretty',
                  options: { colorize: true, singleLine: true },
                }
              : undefined,
          genReqId: (req) => req.id,
          customProps: (req) => ({ requestId: req.id }),
          redact: {
            paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
            remove: true,
          },
          autoLogging: true,
        },
      }),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    HealthModule,
    ProcurementModule,
    LocationsModule,
    DepartmentsModule,
    CostCentersModule,
    CategoriesModule,
    WorkflowModule,
    SuppliersModule,
    FilesModule,
    CustomRolesModule,
  ],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_INTERCEPTOR, useClass: SecurityHeadersInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
    { provide: APP_INTERCEPTOR, useClass: RequestIdInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
