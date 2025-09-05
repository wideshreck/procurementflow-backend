// src/config/environment.ts
import { z } from 'zod';

// Environment variable validation schema
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),

  // Provide safe fallbacks for local development so the application can start
  DATABASE_URL: z
    .string()
    .url()
    .default('postgresql://postgres:postgres@localhost:5432/app?schema=public'),

  // Use a deterministic default development secret (32 chars) to satisfy validation
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters long')
    .default('dev-secret-key-that-is-at-least-32-chars!!'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  JWT_ISSUER: z.string().default('procurementflow'),
  JWT_AUDIENCE: z.string().default('procurementflow://web'),
  
  // Encryption key for sensitive data
  ENCRYPTION_KEY: z
    .string()
    .min(32, 'ENCRYPTION_KEY must be at least 32 characters long')
    .default('dev-encryption-key-minimum-32-chars!!'),
  
  // Email configuration
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().default('noreply@procurementflow.com'),
  
  // App URL for email links
  APP_URL: z.string().url().default('http://localhost:3000'),
  
  // Password hashing
  BCRYPT_SALT_ROUNDS: z.coerce.number().default(10),

  COOKIE_SECRET: z.string().min(16, 'COOKIE_SECRET must be at least 16 characters long').default('change-me-please'),

  CORS_ORIGIN: z.string().default('http://localhost:8080'),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW: z.string().default('15 minutes'),

  OAUTH2_CLIENT_ID: z.string().optional(),
  OAUTH2_CLIENT_SECRET: z.string().optional(),
  OAUTH2_AUTH_URL: z.string().url().optional(),
  OAUTH2_TOKEN_URL: z.string().url().optional(),
  OAUTH2_CALLBACK_URL: z.string().url().optional(),

  SWAGGER_ENABLED: z.coerce.boolean().default(true),

  // AI Provider Configuration
  AI_PROVIDER: z.enum(['openai', 'gemini']).default('openai'),
  
  // OpenAI Configuration
  OPENAI_API_KEY: z
    .string()
    .min(1, 'OPENAI_API_KEY is required')
    .default('test-openai-api-key'),
  OPENAI_MODEL: z.string().default('gpt-4o'),
  OPENAI_SEARCH_MODEL: z.string().default('gpt-4o'),
  
  // Gemini Configuration
  GEMINI_API_KEY: z
    .string()
    .optional()
    .default(''),
});

// Export the inferred type for use in ConfigService
export type Env = z.infer<typeof envSchema>;
