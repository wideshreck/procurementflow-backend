// Auth Interfaces
import { User } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  permissions: string[];
  sessionId: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

export interface RefreshTokenPayload {
  sub: string;
  email: string;
  family: string;
  sessionId: string;
  type: 'refresh';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
  tokens: AuthTokens;
}

export interface DeviceInfo {
  fingerprint: string;
  browser?: string;
  os?: string;
  device?: string;
}

export interface LoginAttemptInfo {
  email: string;
  ipAddress: string;
  userAgent?: string;
  success: boolean;
  failReason?: string;
}

export interface PasswordStrength {
  score: number; // 0-4
  feedback: string[];
  isValid: boolean;
}

export interface MfaBackupCodes {
  codes: string[];
  createdAt: Date;
}
