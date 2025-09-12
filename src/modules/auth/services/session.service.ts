import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CryptoService } from './crypto.service';
import { AUTH_CONSTANTS } from '../constants/auth.constants';
import { DeviceInfo } from '../interfaces/auth.interfaces';

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async createSession(
    userId: string,
    ipAddress: string,
    userAgent?: string,
    deviceInfo?: DeviceInfo,
  ) {
    // Clean up old sessions if max limit reached
    await this.cleanupOldSessions(userId);

    const token = this.crypto.generateSecureToken(64);
    const expiresAt = new Date(Date.now() + AUTH_CONSTANTS.SESSION_IDLE_TIMEOUT);

    const session = await (this.prisma as any).session.create({
      data: {
        userId,
        token,
        ipAddress,
        userAgent,
        deviceInfo: deviceInfo as any,
        expiresAt,
      },
    });

    return session;
  }

  async validateSession(token: string): Promise<boolean> {
    const session = await (this.prisma as any).session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session) {
      return false;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await (this.prisma as any).session.delete({ where: { id: session.id } });
      return false;
    }

    // Check if user is active
    if (!session.user.isActive) {
      return false;
    }

    // Update last used timestamp
    await (this.prisma as any).session.update({
      where: { id: session.id },
      data: {
        lastUsedAt: new Date(),
        expiresAt: new Date(Date.now() + AUTH_CONSTANTS.SESSION_IDLE_TIMEOUT),
      },
    });

    return true;
  }

  async validateSessionById(sessionId: string): Promise<boolean> {
    const session = await (this.prisma as any).session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session) {
      return false;
    }

    const now = new Date();

    // Check if session is expired
    if (session.expiresAt < now) {
      // Silently delete expired session
      try {
        await (this.prisma as any).session.delete({ where: { id: session.id } });
      } catch (error) {
        // Ignore delete errors (session might already be deleted)
      }
      return false;
    }

    // Check if user is active
    if (!session.user.isActive) {
      return false;
    }

    // Update last used timestamp only if more than 1 minute has passed
    // This prevents too frequent database updates
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    if (session.lastUsedAt < oneMinuteAgo) {
      try {
        await (this.prisma as any).session.update({
          where: { id: session.id },
          data: {
            lastUsedAt: now,
            expiresAt: new Date(now.getTime() + AUTH_CONSTANTS.SESSION_IDLE_TIMEOUT),
          },
        });
      } catch (error) {
        // If update fails, session might be deleted by another process
        // Just return false to be safe
        return false;
      }
    }

    return true;
  }

  async getSession(token: string) {
    const session = await (this.prisma as any).session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    return session;
  }

  async revokeSession(sessionId: string) {
    await (this.prisma as any).session.delete({
      where: { id: sessionId },
    });
  }

  async revokeAllUserSessions(userId: string, exceptSessionId?: string) {
    const whereClause: any = { userId };
    if (exceptSessionId) {
      whereClause.id = { not: exceptSessionId };
    }

    await (this.prisma as any).session.deleteMany({
      where: whereClause,
    });
  }

  async getUserSessions(userId: string) {
    return (this.prisma as any).session.findMany({
      where: { userId },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  async cleanupExpiredSessions() {
    const deleted = await (this.prisma as any).session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    return deleted.count;
  }

  private async cleanupOldSessions(userId: string) {
    const sessions = await (this.prisma as any).session.findMany({
      where: { userId },
      orderBy: { lastUsedAt: 'desc' },
    });

    if (sessions.length >= AUTH_CONSTANTS.MAX_SESSIONS_PER_USER) {
      const sessionsToDelete = sessions.slice(AUTH_CONSTANTS.MAX_SESSIONS_PER_USER - 1);
      await (this.prisma as any).session.deleteMany({
        where: {
          id: { in: sessionsToDelete.map(s => s.id) },
        },
      });
    }
  }

  async updateSessionActivity(sessionId: string, ipAddress?: string, userAgent?: string) {
    const updateData: any = {
      lastUsedAt: new Date(),
      expiresAt: new Date(Date.now() + AUTH_CONSTANTS.SESSION_IDLE_TIMEOUT),
    };

    if (ipAddress) {
      updateData.ipAddress = ipAddress;
    }

    if (userAgent) {
      updateData.userAgent = userAgent;
    }

    return (this.prisma as any).session.update({
      where: { id: sessionId },
      data: updateData,
    });
  }
}
