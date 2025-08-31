import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AUTH_CONSTANTS } from '../constants/auth.constants';
import { LoginAttemptInfo } from '../interfaces/auth.interfaces';

@Injectable()
export class LoginAttemptService {
  constructor(private readonly prisma: PrismaService) {}

  async recordAttempt(info: LoginAttemptInfo & { userId?: string }) {
    await (this.prisma as any).loginAttempt.create({
      data: {
        email: info.email.toLowerCase(),
        userId: info.userId,
        ipAddress: info.ipAddress,
        userAgent: info.userAgent,
        success: info.success,
        failReason: info.failReason,
      },
    });
  }

  async getRecentFailedAttempts(email: string): Promise<number> {
    const windowStart = new Date(Date.now() - AUTH_CONSTANTS.LOGIN_ATTEMPTS_WINDOW);
    
    const count = await (this.prisma as any).loginAttempt.count({
      where: {
        email: email.toLowerCase(),
        success: false,
        createdAt: { gte: windowStart },
      },
    });

    return count;
  }

  async getRecentFailedAttemptsByIp(ipAddress: string): Promise<number> {
    const windowStart = new Date(Date.now() - AUTH_CONSTANTS.LOGIN_ATTEMPTS_WINDOW);
    
    const count = await (this.prisma as any).loginAttempt.count({
      where: {
        ipAddress,
        success: false,
        createdAt: { gte: windowStart },
      },
    });

    return count;
  }

  async isAccountLocked(email: string): Promise<boolean> {
    const failedAttempts = await this.getRecentFailedAttempts(email);
    return failedAttempts >= AUTH_CONSTANTS.MAX_LOGIN_ATTEMPTS;
  }

  async isIpBlocked(ipAddress: string): Promise<boolean> {
    const failedAttempts = await this.getRecentFailedAttemptsByIp(ipAddress);
    // Higher threshold for IP blocking
    return failedAttempts >= AUTH_CONSTANTS.MAX_LOGIN_ATTEMPTS * 3;
  }

  async getAccountLockTimeRemaining(email: string): Promise<number | null> {
    const attempts = await (this.prisma as any).loginAttempt.findMany({
      where: {
        email: email.toLowerCase(),
        success: false,
      },
      orderBy: { createdAt: 'desc' },
      take: AUTH_CONSTANTS.MAX_LOGIN_ATTEMPTS,
    });

    if (attempts.length < AUTH_CONSTANTS.MAX_LOGIN_ATTEMPTS) {
      return null;
    }

    const lastAttemptTime = attempts[0].createdAt.getTime();
    const lockEndTime = lastAttemptTime + AUTH_CONSTANTS.ACCOUNT_LOCK_DURATION;
    const now = Date.now();

    if (lockEndTime > now) {
      return lockEndTime - now;
    }

    return null;
  }

  async getUserLoginHistory(userId: string, limit: number = 20) {
    return (this.prisma as any).loginAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getLoginAttemptsByEmail(email: string, limit: number = 20) {
    return (this.prisma as any).loginAttempt.findMany({
      where: { email: email.toLowerCase() },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getLoginAttemptsByIp(ipAddress: string, limit: number = 20) {
    return (this.prisma as any).loginAttempt.findMany({
      where: { ipAddress },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async cleanupOldAttempts(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const deleted = await (this.prisma as any).loginAttempt.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    return deleted.count;
  }

  async getSuspiciousLoginPatterns(userId: string) {
    const recentLogins = await (this.prisma as any).loginAttempt.findMany({
      where: {
        userId,
        success: true,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
      },
      orderBy: { createdAt: 'desc' },
    });

    // Analyze for suspicious patterns
    const ipAddresses = new Set(recentLogins.map(l => l.ipAddress));
    const userAgents = new Set(recentLogins.map(l => l.userAgent).filter(Boolean));
    
    const patterns = {
      multipleIps: ipAddresses.size > 3,
      multipleDevices: userAgents.size > 3,
      rapidLocationChanges: false, // Would need geolocation service
      unusualTimes: this.hasUnusualLoginTimes(recentLogins),
    };

    return {
      patterns,
      details: {
        uniqueIps: Array.from(ipAddresses),
        uniqueDevices: Array.from(userAgents),
        loginCount: recentLogins.length,
      },
    };
  }

  private hasUnusualLoginTimes(attempts: any[]): boolean {
    const hourCounts = new Array(24).fill(0);
    
    attempts.forEach(attempt => {
      const hour = new Date(attempt.createdAt).getHours();
      hourCounts[hour]++;
    });

    // Check for logins during unusual hours (e.g., 2 AM - 5 AM)
    const unusualHours = hourCounts.slice(2, 6).reduce((sum, count) => sum + count, 0);
    const totalLogins = attempts.length;

    return unusualHours > totalLogins * 0.3; // More than 30% during unusual hours
  }
}
