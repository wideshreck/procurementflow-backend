import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CryptoService } from './crypto.service';
import { AUTH_CONSTANTS } from '../constants/auth.constants';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

@Injectable()
export class MfaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
  ) {}

  async generateMfaSecret(userId: string, email: string): Promise<{
    secret: string;
    qrCode: string;
    backupCodes: string[];
  }> {
    // Check if MFA is already enabled
    const existingMfa = await (this.prisma as any).twoFactorAuth.findUnique({
      where: { userId },
    });

    if (existingMfa && existingMfa.enabled) {
      throw new BadRequestException('MFA zaten aktif');
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      length: 32,
      name: `ProcurementFlow (${email})`,
      issuer: 'ProcurementFlow',
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    // Generate backup codes
    const backupCodes = this.crypto.generateBackupCodes();

    // Don't save yet - wait for verification
    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      backupCodes,
    };
  }

  async enableMfa(
    userId: string,
    secret: string,
    verificationCode: string,
    backupCodes: string[],
  ): Promise<boolean> {
    // Verify the code first
    const isValid = this.verifyTotp(secret, verificationCode);
    if (!isValid) {
      throw new BadRequestException('Geçersiz doğrulama kodu');
    }

    // Encrypt secret and backup codes
    const encryptedSecret = this.crypto.encrypt(secret);
    const hashedBackupCodes = await this.crypto.hashBackupCodes(backupCodes);

    // Store in database
    await (this.prisma as any).twoFactorAuth.upsert({
      where: { userId },
      create: {
        userId,
        secret: encryptedSecret,
        backupCodes: hashedBackupCodes,
        enabled: true,
      },
      update: {
        secret: encryptedSecret,
        backupCodes: hashedBackupCodes,
        enabled: true,
      },
    });

    return true;
  }

  async disableMfa(userId: string, password: string): Promise<boolean> {
    // Verify user password first (this should be done in auth service)
    // For now, we'll just disable it
    
    await (this.prisma as any).twoFactorAuth.update({
      where: { userId },
      data: { enabled: false },
    });

    return true;
  }

  async verifyMfa(userId: string, code: string): Promise<boolean> {
    const mfa = await (this.prisma as any).twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!mfa || !mfa.enabled) {
      throw new BadRequestException('MFA aktif değil');
    }

    // First try TOTP code
    const decryptedSecret = this.crypto.decrypt(mfa.secret);
    if (this.verifyTotp(decryptedSecret, code)) {
      return true;
    }

    // If TOTP fails, try backup codes
    return this.verifyBackupCode(userId, code);
  }

  private verifyTotp(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: AUTH_CONSTANTS.MFA_WINDOW,
    });
  }

  private async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const mfa = await (this.prisma as any).twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!mfa) {
      return false;
    }

    // Check each backup code
    for (let i = 0; i < mfa.backupCodes.length; i++) {
      const hashedCode = mfa.backupCodes[i];
      const isValid = await this.crypto.verifyPassword(hashedCode, code);
      
      if (isValid) {
        // Remove used backup code
        const newBackupCodes = [...mfa.backupCodes];
        newBackupCodes.splice(i, 1);
        
        await (this.prisma as any).twoFactorAuth.update({
          where: { userId },
          data: { backupCodes: newBackupCodes },
        });
        
        return true;
      }
    }

    return false;
  }

  async generateNewBackupCodes(userId: string, password: string): Promise<string[]> {
    // Verify user password first (this should be done in auth service)
    
    const mfa = await (this.prisma as any).twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!mfa || !mfa.enabled) {
      throw new BadRequestException('MFA aktif değil');
    }

    // Generate new backup codes
    const backupCodes = this.crypto.generateBackupCodes();
    const hashedBackupCodes = await this.crypto.hashBackupCodes(backupCodes);

    // Update in database
    await (this.prisma as any).twoFactorAuth.update({
      where: { userId },
      data: { backupCodes: hashedBackupCodes },
    });

    return backupCodes;
  }

  async isMfaEnabled(userId: string): Promise<boolean> {
    const mfa = await (this.prisma as any).twoFactorAuth.findUnique({
      where: { userId },
    });

    return mfa?.enabled || false;
  }

  async getMfaStatus(userId: string): Promise<{
    enabled: boolean;
    backupCodesRemaining: number;
  }> {
    const mfa = await (this.prisma as any).twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!mfa) {
      return {
        enabled: false,
        backupCodesRemaining: 0,
      };
    }

    return {
      enabled: mfa.enabled,
      backupCodesRemaining: mfa.backupCodes.length,
    };
  }
}
