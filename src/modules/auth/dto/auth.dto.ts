import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { AUTH_CONSTANTS } from '../constants/auth.constants';

// Common schemas
const email = z
  .string()
  .min(1, 'Email gereklidir')
  .email('Geçersiz email formatı')
  .transform((v) => v.trim().toLowerCase());

const password = z
  .string()
  .min(AUTH_CONSTANTS.PASSWORD_MIN_LENGTH, `Şifre en az ${AUTH_CONSTANTS.PASSWORD_MIN_LENGTH} karakter olmalıdır`)
  .max(AUTH_CONSTANTS.PASSWORD_MAX_LENGTH, `Şifre en fazla ${AUTH_CONSTANTS.PASSWORD_MAX_LENGTH} karakter olabilir`);

const fullName = z
  .string()
  .min(1, 'Ad soyad gereklidir')
  .max(200, 'Ad soyad çok uzun')
  .transform((v) => v.trim())
  .refine((v) => v.split(' ').length >= 2, 'Lütfen ad ve soyadınızı girin');

// SignUpDto için 'company' bir string olarak kalacak çünkü kullanıcıdan bu şekilde alınıyor.
const companySignUp = z
  .string()
  .min(1, 'Şirket adı gereklidir')
  .max(200, 'Şirket adı çok uzun')
  .transform((v) => v.trim());

const phone = z
  .string()
  .optional()
  .transform((v) => v?.trim())
  .refine((v) => !v || /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/.test(v), 'Geçersiz telefon numarası');

const department = z
  .string()
  .optional()
  .transform((v) => v?.trim());

// Sign up schema
export const SignUpSchema = z.object({
  email,
  password,
  fullName,
  company: companySignUp,
  phone,
  department,
});
export class SignUpDto extends createZodDto(SignUpSchema) {}

// Sign in schema
export const SignInSchema = z.object({
  email,
  password,
});
export class SignInDto extends createZodDto(SignInSchema) {}

// Token response schema
// DÜZELTME: `user.company` alanı, `users.service.ts`'den dönen `company: { name: string }` yapısına uygun hale getirildi.
export const TokenResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    fullName: z.string(),
    company: z.object({ name: z.string() }), // Düzeltme burada yapıldı.
    role: z.enum(['USER', 'ADMIN']),
    isActive: z.boolean(),
  }),
  tokens: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
    csrfToken: z.string(),
  }),
});
export class TokenResponseDto extends createZodDto(TokenResponseSchema) {}

// Password reset request schema
export const PasswordResetRequestSchema = z.object({
  email,
});
export class PasswordResetRequestDto extends createZodDto(PasswordResetRequestSchema) {}

// Password reset schema
export const PasswordResetSchema = z.object({
  token: z.string().min(1, 'Token gereklidir'),
  newPassword: password,
});
export class PasswordResetDto extends createZodDto(PasswordResetSchema) {}

// Change password schema
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mevcut şifre gereklidir'),
  newPassword: password,
});
export class ChangePasswordDto extends createZodDto(ChangePasswordSchema) {}

// Session info schema
export const SessionInfoSchema = z.object({
  id: z.string(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  deviceInfo: z.any().nullable(),
  lastUsedAt: z.date(),
  createdAt: z.date(),
  isCurrent: z.boolean().optional(),
});
export class SessionInfoDto extends createZodDto(SessionInfoSchema) {}

// Audit log schema
export const AuditLogSchema = z.object({
  id: z.string(),
  action: z.string(),
  resource: z.string().nullable(),
  resourceId: z.string().nullable(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  metadata: z.any().nullable(),
  createdAt: z.date(),
});
export class AuditLogDto extends createZodDto(AuditLogSchema) {}

// Generic response schemas
export const SuccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
});
export class SuccessResponseDto extends createZodDto(SuccessResponseSchema) {}

export const ErrorResponseSchema = z.object({
  statusCode: z.number(),
  message: z.string(),
  errors: z.array(z.string()).optional(),
  timestamp: z.string(),
  path: z.string(),
});
export class ErrorResponseDto extends createZodDto(ErrorResponseSchema) {}
