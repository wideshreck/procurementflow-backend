import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { CryptoService } from '../services/crypto.service';

export const SKIP_CSRF_KEY = 'skipCsrf';

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private cryptoService: CryptoService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const skipCsrf = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipCsrf) {
      return true;
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const method = request.method.toUpperCase();

    // CSRF protection only needed for state-changing methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    const headerToken = request.headers['x-csrf-token'] as string;
    const cookieToken = request.cookies['csrf-token'];

    // If no CSRF tokens are provided, check if this is an authenticated request
    // For authenticated requests, CSRF protection is less critical
    if (!headerToken && !cookieToken) {
      const authHeader = request.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        // This is an authenticated request with Bearer token, allow it
        return true;
      }
      throw new UnauthorizedException('CSRF token missing');
    }

    // If only one token is missing, fail
    if (!headerToken || !cookieToken) {
      throw new UnauthorizedException('CSRF token incomplete');
    }

    try {
      // Use timing-safe comparison to verify that the header token matches the cookie token
      const isValid = this.cryptoService.verifyCsrfToken(headerToken, cookieToken);
      if (!isValid) {
        throw new UnauthorizedException('Invalid CSRF token');
      }
    } catch (error) {
      throw new UnauthorizedException('Invalid CSRF token');
    }

    return true;
  }
}
