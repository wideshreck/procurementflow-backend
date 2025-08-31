// Auth System Constants
export const AUTH_CONSTANTS = {
  // Token expiration times
  ACCESS_TOKEN_EXPIRES_IN: '15m',
  REFRESH_TOKEN_EXPIRES_IN: '7d',
  EMAIL_VERIFICATION_TOKEN_EXPIRES_IN: '24h',
  PASSWORD_RESET_TOKEN_EXPIRES_IN: '1h',
  
  // Security
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_ATTEMPTS_WINDOW: 15 * 60 * 1000, // 15 minutes
  ACCOUNT_LOCK_DURATION: 30 * 60 * 1000, // 30 minutes
  
  // Argon2 settings
  ARGON2_TIME_COST: 2,
  ARGON2_MEMORY_COST: 65536,
  ARGON2_PARALLELISM: 1,
  
  // Rate limiting
  RATE_LIMIT_TTL: 15 * 60, // 15 minutes
  RATE_LIMIT_MAX: 10, // max requests per TTL
  
  // Session
  SESSION_IDLE_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  MAX_SESSIONS_PER_USER: 5,
  
  // Password rules
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  PASSWORD_REQUIRE_UPPERCASE: true,
  PASSWORD_REQUIRE_LOWERCASE: true,
  PASSWORD_REQUIRE_NUMBER: true,
  PASSWORD_REQUIRE_SPECIAL: true,
  
  // MFA
  MFA_WINDOW: 1, // Time window for TOTP
  MFA_BACKUP_CODES_COUNT: 10,
  
  // Cookie names
  REFRESH_TOKEN_COOKIE: 'refresh_token',
  CSRF_TOKEN_COOKIE: 'csrf-token',
  
  // Audit log actions
  AUDIT_ACTIONS: {
    LOGIN: 'login',
    LOGOUT: 'logout',
    LOGIN_FAILED: 'login_failed',
    REGISTER: 'register',
    PASSWORD_CHANGE: 'password_change',
    PASSWORD_RESET: 'password_reset',
    PASSWORD_RESET_REQUEST: 'password_reset_request',
    EMAIL_VERIFICATION: 'email_verification',
    MFA_ENABLE: 'mfa_enable',
    MFA_DISABLE: 'mfa_disable',
    SESSION_CREATE: 'session_create',
    SESSION_REVOKE: 'session_revoke',
    ACCOUNT_LOCK: 'account_lock',
    ACCOUNT_UNLOCK: 'account_unlock',
  },
} as const;

export type AuditAction = typeof AUTH_CONSTANTS.AUDIT_ACTIONS[keyof typeof AUTH_CONSTANTS.AUDIT_ACTIONS];
