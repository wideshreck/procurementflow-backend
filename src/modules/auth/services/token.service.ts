import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { CryptoService } from './crypto.service';
import { AUTH_CONSTANTS } from '../constants/auth.constants';
import { JwtPayload, RefreshTokenPayload, AuthTokens } from '../interfaces/auth.interfaces';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async generateTokens(
    userId: string,
    email: string,
    permissions: string[],
    sessionId: string,
    ipAddress?: string,
    userAgent?: string,
    deviceInfo?: any,
  ): Promise<AuthTokens> {
    const tokenFamily = this.crypto.generateSecureToken(32);

    const csrfToken = this.crypto.generateSecureToken(16); // 16 bytes for CSRF token

    const jti = this.crypto.generateSecureToken(16);
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken({ sub: userId, email, permissions, sessionId }),
      this.generateRefreshToken({
        sub: userId,
        email,
        family: tokenFamily,
        sessionId,
        jti,
        type: 'refresh',
      }),
    ]);

    // Store refresh token in database
    await this.storeRefreshToken(
      userId,
      refreshToken,
      tokenFamily,
      ipAddress,
      userAgent,
      deviceInfo,
    );

    return { accessToken, refreshToken, csrfToken };
  }

  private async generateAccessToken(payload: Omit<JwtPayload, 'role'> & { permissions: string[] }): Promise<string> {
    return this.jwt.signAsync(payload, {
      expiresIn: AUTH_CONSTANTS.ACCESS_TOKEN_EXPIRES_IN,
      issuer: this.config.get<string>('JWT_ISSUER', 'procurementflow'),
      audience: this.config.get<string>('JWT_AUDIENCE', 'procurementflow://web'),
    });
  }

  private async generateRefreshToken(payload: RefreshTokenPayload): Promise<string> {
    return this.jwt.signAsync(payload, {
      expiresIn: AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRES_IN,
      issuer: this.config.get<string>('JWT_ISSUER', 'procurementflow'),
      audience: this.config.get<string>('JWT_AUDIENCE', 'procurementflow://web'),
    });
  }

  private async storeRefreshToken(
    userId: string,
    token: string,
    family: string,
    ipAddress?: string,
    userAgent?: string,
    deviceInfo?: any,
  ) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await (this.prisma as any).refreshToken.create({
      data: {
        userId,
        token,
        family,
        ipAddress,
        userAgent,
        deviceInfo,
        expiresAt,
      },
    });
  }

  async rotateRefreshToken(
    oldToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthTokens> {
    let payload: RefreshTokenPayload;
    
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(oldToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Use a transaction to prevent race conditions
    return await (this.prisma as any).$transaction(async (tx: any) => {
      // Find the stored token
      const storedToken = await tx.refreshToken.findUnique({
        where: { token: oldToken },
        include: { user: { include: { customRole: true } } },
      });

      if (!storedToken || storedToken.isRevoked) {
        // Token reuse detected - revoke entire family
        if (storedToken) {
          await tx.refreshToken.updateMany({
            where: { family: storedToken.family },
            data: {
              isRevoked: true,
              revokedAt: new Date(),
            },
          });
        }
        throw new UnauthorizedException('Token reuse detected');
      }

      const now = new Date();

      // Check if token is expired
      if (storedToken.expiresAt < now) {
        await tx.refreshToken.update({
          where: { token: oldToken },
          data: {
            isRevoked: true,
            revokedAt: now,
          },
        });
        throw new UnauthorizedException('Refresh token expired');
      }

      // Check if user is still active
      if (!storedToken.user.isActive) {
        await tx.refreshToken.update({
          where: { token: oldToken },
          data: {
            isRevoked: true,
            revokedAt: now,
          },
        });
        throw new UnauthorizedException('User account is disabled');
      }

      // Revoke old token
      await tx.refreshToken.update({
        where: { token: oldToken },
        data: {
          isRevoked: true,
          revokedAt: now,
        },
      });

      // Generate new tokens with same family
      const csrfToken = this.crypto.generateSecureToken(16);
      const permissions = storedToken.user.customRole?.permissions as string[] || [];
      const jti = this.crypto.generateSecureToken(16);
      const [accessToken, refreshToken] = await Promise.all([
        this.generateAccessToken({
          sub: storedToken.userId,
          email: storedToken.user.email,
          permissions,
          sessionId: payload.sessionId,
        }),
        this.generateRefreshToken({
          sub: storedToken.userId,
          email: storedToken.user.email,
          family: storedToken.family,
          sessionId: payload.sessionId,
          jti,
          type: 'refresh',
        }),
      ]);

      // Store new refresh token
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

      await tx.refreshToken.create({
        data: {
          userId: storedToken.userId,
          token: refreshToken,
          family: storedToken.family,
          ipAddress: ipAddress || storedToken.ipAddress || undefined,
          userAgent: userAgent || storedToken.userAgent || undefined,
          deviceInfo: storedToken.deviceInfo,
          expiresAt,
        },
      });

      return { accessToken, refreshToken, csrfToken };
    });
  }

  async revokeToken(token: string) {
    await (this.prisma as any).refreshToken.update({
      where: { token },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }

  async revokeTokenFamily(family: string) {
    await (this.prisma as any).refreshToken.updateMany({
      where: { family },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }

  async revokeAllUserTokens(userId: string) {
    await (this.prisma as any).refreshToken.updateMany({
      where: { userId },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }

  async cleanupExpiredTokens() {
    const deleted = await (this.prisma as any).refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          {
            isRevoked: true,
            revokedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // 30 days old
          },
        ],
      },
    });

    return deleted.count;
  }

  async verifyAccessToken(token: string): Promise<JwtPayload> {
    try {
      return await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  async generatePasswordResetToken(userId: string, ipAddress?: string): Promise<string> {
    const token = this.crypto.generateSecureToken(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await (this.prisma as any).passwordReset.create({
      data: {
        userId,
        token,
        ipAddress,
        expiresAt,
      },
    });

    return token;
  }
}
