import { SetMetadata } from '@nestjs/common';

export interface RateLimitOptions {
  points: number; // Number of requests
  duration: number; // Duration in seconds
  blockDuration?: number; // Block duration in seconds
}

export const RATE_LIMIT_KEY = 'rateLimit';
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);
