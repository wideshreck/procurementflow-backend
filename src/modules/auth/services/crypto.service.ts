import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { AUTH_CONSTANTS } from '../constants/auth.constants';

@Injectable()
export class CryptoService {
  // Argon2 password hashing
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      timeCost: AUTH_CONSTANTS.ARGON2_TIME_COST,
      memoryCost: AUTH_CONSTANTS.ARGON2_MEMORY_COST,
      parallelism: AUTH_CONSTANTS.ARGON2_PARALLELISM,
    });
  }

  async verifyPassword(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  // Generate secure random tokens
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  generateNumericCode(length: number = 6): string {
    const max = Math.pow(10, length) - 1;
    const min = Math.pow(10, length - 1);
    const code = crypto.randomInt(min, max + 1);
    return code.toString();
  }

  // Generate CSRF token
  generateCsrfToken(): string {
    return this.generateSecureToken(32);
  }

  // Verify CSRF token
  verifyCsrfToken(token: string, sessionToken: string): boolean {
    return crypto.timingSafeEqual(
      Buffer.from(token),
      Buffer.from(sessionToken)
    );
  }

  // Generate backup codes for MFA
  generateBackupCodes(count: number = AUTH_CONSTANTS.MFA_BACKUP_CODES_COUNT): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(`${this.generateNumericCode(4)}-${this.generateNumericCode(4)}`);
    }
    return codes;
  }

  // Hash backup codes for storage
  async hashBackupCodes(codes: string[]): Promise<string[]> {
    return Promise.all(codes.map(code => this.hashPassword(code)));
  }

  // Generate device fingerprint
  generateDeviceFingerprint(userAgent: string, ipAddress: string, additionalData?: any): string {
    const data = JSON.stringify({
      userAgent,
      ipAddress,
      ...additionalData
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Encrypt/Decrypt sensitive data (for MFA secrets, etc.)
  private getEncryptionKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY is not set');
    }
    return crypto.scryptSync(key, 'salt', 32);
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const key = this.getEncryptionKey();
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const key = this.getEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
