import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CryptoService,
  PasswordValidatorService,
  SessionService,
  TokenService,
  AuditLogService,
  LoginAttemptService,
  EmailService
} from './services';
import { AUTH_CONSTANTS } from './constants/auth.constants';
import { AuthResponse, DeviceInfo } from './interfaces/auth.interfaces';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly crypto: CryptoService,
    private readonly passwordValidator: PasswordValidatorService,
    private readonly sessions: SessionService,
    private readonly tokens: TokenService,
    private readonly auditLog: AuditLogService,
    private readonly loginAttempts: LoginAttemptService,
    private readonly email: EmailService,
  ) {}

  // ===== REGISTRATION =====
  async signUp(dto: {
    email: string;
    password: string;
    fullName: string;
    company: string;
    phone?: string;
    department?: string;
  }, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const email = dto.email.trim().toLowerCase();

    // Check if user already exists
    const existing = await this.users.findByEmail(email);
    if (existing) {
      await this.auditLog.log({
        action: AUTH_CONSTANTS.AUDIT_ACTIONS.REGISTER,
        ipAddress,
        userAgent,
        metadata: { email, success: false, reason: 'Email already exists' },
      });
      throw new ConflictException('Bu email adresi zaten kullanımda');
    }

    // Validate password strength
    const passwordStrength = this.passwordValidator.validatePassword(
      dto.password,
      { email, fullName: dto.fullName }
    );

    if (!passwordStrength.isValid) {
      throw new BadRequestException({
        message: 'Şifre yeterince güçlü değil',
        errors: passwordStrength.feedback,
      });
    }

    // Hash password with Argon2
    const passwordHash = await this.crypto.hashPassword(dto.password);

    // Create user
    const user = await this.users.createUser({
      email,
      passwordHash,
      fullName: dto.fullName.trim(),
      company: dto.company.trim(),
      phone: dto.phone?.trim(),
      department: dto.department?.trim(),
    });

    // Create session
    const deviceInfo = this.extractDeviceInfo(userAgent);
    const session = await this.sessions.createSession(
      user.id,
      ipAddress || 'unknown',
      userAgent,
      deviceInfo,
    );

    // Generate tokens
    const userWithRole = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { customRole: true },
    });
    if (!userWithRole) {
      throw new UnauthorizedException('User not found');
    }
    const permissions = userWithRole.customRole?.permissions as string[] || [];
    const tokens = await this.tokens.generateTokens(
      user.id,
      user.email,
      permissions,
      session.id,
      ipAddress,
      userAgent,
      deviceInfo,
    );

    // Audit log
    await this.auditLog.logLogin(user.id, ipAddress, userAgent, {
      action: 'register',
      sessionId: session.id,
    });

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  // ===== LOGIN =====
  async signIn(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResponse> {
    const normalizedEmail = email.trim().toLowerCase();

    // Check if account/IP is locked
    const [isAccountLocked, isIpBlocked] = await Promise.all([
      this.loginAttempts.isAccountLocked(normalizedEmail),
      ipAddress ? this.loginAttempts.isIpBlocked(ipAddress) : false,
    ]);

    if (isAccountLocked) {
      const timeRemaining = await this.loginAttempts.getAccountLockTimeRemaining(normalizedEmail);
      throw new ForbiddenException({
        message: 'Hesap geçici olarak kilitlendi',
        lockTimeRemaining: timeRemaining,
      });
    }

    if (isIpBlocked) {
      throw new ForbiddenException('IP adresi engellenmiş');
    }

    // Find user with password
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      await this.recordFailedLogin(normalizedEmail, ipAddress, userAgent, 'User not found');
      throw new UnauthorizedException('Geçersiz email veya şifre');
    }

    // Verify password
    const isPasswordValid = await this.crypto.verifyPassword(user.password, password);
    if (!isPasswordValid) {
      await this.recordFailedLogin(normalizedEmail, ipAddress, userAgent, 'Invalid password', user.id);
      throw new UnauthorizedException('Geçersiz email veya şifre');
    }

    // Check if user is active
    if (!user.isActive) {
      await this.recordFailedLogin(normalizedEmail, ipAddress, userAgent, 'Account disabled', user.id);
      throw new UnauthorizedException('Hesap devre dışı bırakılmış');
    }

    // Create session
    const deviceInfo = this.extractDeviceInfo(userAgent);
    const session = await this.sessions.createSession(
      user.id,
      ipAddress || 'unknown',
      userAgent,
      deviceInfo,
    );

    // Generate tokens
    const userWithRole = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { customRole: true },
    });
    if (!userWithRole) {
      throw new UnauthorizedException('User not found');
    }
    const permissions = userWithRole.customRole?.permissions as string[] || [];
    const tokens = await this.tokens.generateTokens(
      user.id,
      user.email,
      permissions,
      session.id,
      ipAddress,
      userAgent,
      deviceInfo,
    );

    // Update last login info
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });

    // Record successful login
    await this.loginAttempts.recordAttempt({
      email: normalizedEmail,
      userId: user.id,
      ipAddress: ipAddress || 'unknown',
      userAgent,
      success: true,
    });

    // Audit log
    await this.auditLog.logLogin(user.id, ipAddress, userAgent, {
      sessionId: session.id,
    });

    // Check for suspicious login patterns and send alert if needed
    // if (ipAddress) {
    //   const suspicious = await this.loginAttempts.getSuspiciousLoginPatterns(user.id);
    //   if (suspicious.patterns.multipleIps || suspicious.patterns.unusualTimes) {
    //     await this.email.sendLoginAlertEmail(
    //       user.email,
    //       user.fullName,
    //       ipAddress,
    //       userAgent,
    //     );
    //   }
    // }
    
    const publicUser = await this.users.getPublicUserById(user.id);
    return {
      user: this.sanitizeUser(publicUser),
      tokens,
    };
  }

  // ===== LOGOUT =====
  async logout(sessionId: string, userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    // Revoke session
    await this.sessions.revokeSession(sessionId);

    // Revoke all tokens for this user
    await this.tokens.revokeAllUserTokens(userId);

    // Audit log
    await this.auditLog.logLogout(userId, ipAddress, userAgent);
  }

  // ===== TOKEN REFRESH =====
  async refreshTokens(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthResponse> {
    const tokens = await this.tokens.rotateRefreshToken(refreshToken, ipAddress, userAgent);

    // Get user from token
    const payload = await this.tokens.verifyAccessToken(tokens.accessToken);
    const user = await this.users.getPublicUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  // ===== PASSWORD RESET REQUEST =====
  async requestPasswordReset(email: string, ipAddress?: string): Promise<void> {
    const user = await this.users.findByEmail(email);

    // Don't reveal if user exists or not
    if (!user) {
      return;
    }

    // Check for recent password reset requests to prevent abuse
    const recentRequests = await (this.prisma as any).passwordReset.count({
      where: {
        userId: user.id,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // 1 hour
      },
    });

    if (recentRequests >= 3) {
      throw new BadRequestException('Çok fazla şifre sıfırlama talebi. Lütfen daha sonra tekrar deneyin.');
    }

    // Generate reset token
    const resetToken = await this.tokens.generatePasswordResetToken(user.id, ipAddress);

    // Send email
    await this.email.sendPasswordResetEmail(user.email, user.fullName, resetToken);

    // Audit log
    await this.auditLog.log({
      userId: user.id,
      action: AUTH_CONSTANTS.AUDIT_ACTIONS.PASSWORD_RESET_REQUEST,
      ipAddress,
      metadata: { email },
    });
  }

  // ===== PASSWORD RESET =====
  async resetPassword(token: string, newPassword: string, ipAddress?: string): Promise<void> {
    const resetToken = await (this.prisma as any).passwordReset.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      throw new BadRequestException('Geçersiz şifre sıfırlama linki');
    }

    if (resetToken.used) {
      throw new BadRequestException('Bu link daha önce kullanılmış');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Şifre sıfırlama linki süresi dolmuş');
    }

    // Validate new password
    const passwordStrength = this.passwordValidator.validatePassword(
      newPassword,
      { email: resetToken.user.email, fullName: resetToken.user.fullName }
    );

    if (!passwordStrength.isValid) {
      throw new BadRequestException({
        message: 'Şifre yeterince güçlü değil',
        errors: passwordStrength.feedback,
      });
    }

    // Hash new password
    const passwordHash = await this.crypto.hashPassword(newPassword);

    // Update password and mark token as used
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: passwordHash },
      }),
      (this.prisma as any).passwordReset.update({
        where: { id: resetToken.id },
        data: {
          used: true,
          usedAt: new Date(),
        },
      }),
    ]);

    // Revoke all existing sessions and tokens
    await Promise.all([
      this.sessions.revokeAllUserSessions(resetToken.userId),
      this.tokens.revokeAllUserTokens(resetToken.userId),
    ]);

    // Audit log
    await this.auditLog.logPasswordReset(resetToken.userId, ipAddress);
  }

  // ===== CHANGE PASSWORD =====
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isValid = await this.crypto.verifyPassword(user.password, currentPassword);
    if (!isValid) {
      throw new UnauthorizedException('Mevcut şifre yanlış');
    }

    // Validate new password
    const passwordStrength = this.passwordValidator.validatePassword(
      newPassword,
      { email: user.email, fullName: user.fullName }
    );

    if (!passwordStrength.isValid) {
      throw new BadRequestException({
        message: 'Yeni şifre yeterince güçlü değil',
        errors: passwordStrength.feedback,
      });
    }

    // Check if new password is same as current
    const isSamePassword = await this.crypto.verifyPassword(user.password, newPassword);
    if (isSamePassword) {
      throw new BadRequestException('Yeni şifre mevcut şifreyle aynı olamaz');
    }

    // Hash new password
    const passwordHash = await this.crypto.hashPassword(newPassword);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: passwordHash },
    });

    // Audit log
    await this.auditLog.logPasswordChange(userId, ipAddress, userAgent);
  }

  // ===== HELPER METHODS =====
  private async recordFailedLogin(
    email: string,
    ipAddress?: string,
    userAgent?: string,
    reason?: string,
    userId?: string
  ): Promise<void> {
    await this.loginAttempts.recordAttempt({
      email,
      userId,
      ipAddress: ipAddress || 'unknown',
      userAgent,
      success: false,
      failReason: reason,
    });

    await this.auditLog.logLoginFailed(email, ipAddress, userAgent, reason);
  }

  private sanitizeUser(user: any): Omit<User, 'password'> {
      if (!user) return user;
      const { password, ...sanitized } = user;
      return sanitized;
  }

  private extractDeviceInfo(userAgent?: string): DeviceInfo | undefined {
    if (!userAgent) return undefined;

    // Simple device extraction - in production use a proper UA parser
    return {
      fingerprint: this.crypto.generateDeviceFingerprint(userAgent, ''),
      browser: this.extractBrowser(userAgent),
      os: this.extractOS(userAgent),
      device: this.extractDevice(userAgent),
    };
  }

  private extractBrowser(userAgent: string): string {
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private extractOS(userAgent: string): string {
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  private extractDevice(userAgent: string): string {
    if (userAgent.includes('Mobile')) return 'Mobile';
    if (userAgent.includes('Tablet')) return 'Tablet';
    return 'Desktop';
  }
}
