import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../../prisma/prisma.module';

// Services
import {
  CryptoService,
  PasswordValidatorService,
  SessionService,
  TokenService,
  AuditLogService,
  LoginAttemptService,
  MfaService,
  EmailService,
} from './services';
import { CleanupService } from './services/cleanup.service';

// Guards
import { JwtAuthGuard } from './guards/jwt.guard';
import { CsrfGuard } from './guards/csrf.guard';

import { AUTH_CONSTANTS } from './constants/auth.constants';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    UsersModule,
    PrismaModule,
    PassportModule.register({ defaultStrategy: 'jwt', session: false }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET', ''),
        signOptions: {
          expiresIn: AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRES_IN,
          issuer: cfg.get<string>('JWT_ISSUER', 'procurementflow'),
          audience: cfg.get<string>('JWT_AUDIENCE', 'procurementflow://web'),
          algorithm: 'HS256',
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    // Services
    CryptoService,
    PasswordValidatorService,
    SessionService,
    TokenService,
    AuditLogService,
    LoginAttemptService,
    MfaService,
    EmailService,
    CleanupService,
    // Guards
    JwtAuthGuard,
    CsrfGuard,
  ],
  exports: [
    PassportModule,
    JwtModule,
    AuthService,
    // Export guards and services that might be needed elsewhere
    JwtAuthGuard,
    CsrfGuard,
    CryptoService,
    SessionService,
    TokenService,
    AuditLogService,
  ],
})
export class AuthModule {}