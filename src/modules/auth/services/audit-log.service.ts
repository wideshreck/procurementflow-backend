import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditAction } from '../constants/auth.constants';

interface AuditLogData {
  userId?: string;
  action: AuditAction;
  resource?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(data: AuditLogData): Promise<void> {
    try {
      await (this.prisma as any).auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          metadata: data.metadata,
        },
      });
    } catch (error) {
      // Log errors but don't throw - audit logging should not break the flow
      console.error('Failed to create audit log:', error);
    }
  }

  async getUserAuditLogs(userId: string, limit: number = 50) {
    return (this.prisma as any).auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getAuditLogsByAction(action: AuditAction, limit: number = 50) {
    return (this.prisma as any).auditLog.findMany({
      where: { action },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: true },
    });
  }

  async getAuditLogsByResource(resource: string, resourceId?: string, limit: number = 50) {
    const where: any = { resource };
    if (resourceId) {
      where.resourceId = resourceId;
    }

    return (this.prisma as any).auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: true },
    });
  }

  async getAuditLogsByIp(ipAddress: string, limit: number = 50) {
    return (this.prisma as any).auditLog.findMany({
      where: { ipAddress },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: true },
    });
  }

  async getAuditLogsInTimeRange(startDate: Date, endDate: Date, filters?: Partial<AuditLogData>) {
    const where: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (filters) {
      Object.assign(where, filters);
    }

    return (this.prisma as any).auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
  }

  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const deleted = await (this.prisma as any).auditLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    return deleted.count;
  }

  // Helper methods for common audit scenarios
  async logLogin(userId: string, ipAddress?: string, userAgent?: string, metadata?: any) {
    await this.log({
      userId,
      action: 'login',
      ipAddress,
      userAgent,
      metadata,
    });
  }

  async logLoginFailed(email: string, ipAddress?: string, userAgent?: string, reason?: string) {
    await this.log({
      action: 'login_failed',
      ipAddress,
      userAgent,
      metadata: { email, reason },
    });
  }

  async logLogout(userId: string, ipAddress?: string, userAgent?: string) {
    await this.log({
      userId,
      action: 'logout',
      ipAddress,
      userAgent,
    });
  }

  async logPasswordChange(userId: string, ipAddress?: string, userAgent?: string) {
    await this.log({
      userId,
      action: 'password_change',
      ipAddress,
      userAgent,
    });
  }

  async logPasswordReset(userId: string, ipAddress?: string, userAgent?: string) {
    await this.log({
      userId,
      action: 'password_reset',
      ipAddress,
      userAgent,
    });
  }

  async logMfaEnable(userId: string, ipAddress?: string, userAgent?: string) {
    await this.log({
      userId,
      action: 'mfa_enable',
      ipAddress,
      userAgent,
    });
  }

  async logMfaDisable(userId: string, ipAddress?: string, userAgent?: string) {
    await this.log({
      userId,
      action: 'mfa_disable',
      ipAddress,
      userAgent,
    });
  }
}
