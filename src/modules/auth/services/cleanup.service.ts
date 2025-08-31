import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SessionService } from './session.service';
import { TokenService } from './token.service';
import { LoginAttemptService } from './login-attempt.service';
import { AuditLogService } from './audit-log.service';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    private readonly sessions: SessionService,
    private readonly tokens: TokenService,
    private readonly loginAttempts: LoginAttemptService,
    private readonly auditLogs: AuditLogService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredSessions() {
    try {
      const count = await this.sessions.cleanupExpiredSessions();
      if (count > 0) {
        this.logger.log(`Cleaned up ${count} expired sessions`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup expired sessions', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupExpiredTokens() {
    try {
      const count = await this.tokens.cleanupExpiredTokens();
      if (count > 0) {
        this.logger.log(`Cleaned up ${count} expired tokens`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup expired tokens', error);
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async cleanupOldLoginAttempts() {
    try {
      const count = await this.loginAttempts.cleanupOldAttempts(30); // 30 days
      if (count > 0) {
        this.logger.log(`Cleaned up ${count} old login attempts`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup old login attempts', error);
    }
  }

  @Cron(CronExpression.EVERY_WEEK)
  async cleanupOldAuditLogs() {
    try {
      const count = await this.auditLogs.cleanupOldLogs(90); // 90 days
      if (count > 0) {
        this.logger.log(`Cleaned up ${count} old audit logs`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup old audit logs', error);
    }
  }
}
