import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { FastifyReply, FastifyRequest } from 'fastify';
import { CryptoService } from '../services/crypto.service';
import { Env } from 'src/config/environment';

@Injectable()
export class SecurityHeadersInterceptor implements NestInterceptor {
  constructor(
    private readonly cryptoService: CryptoService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const response = context.switchToHttp().getResponse<FastifyReply>();

    // --- CSRF Token Handling ---
    let csrfToken = request.cookies['csrf-token'];
    if (!csrfToken) {
      csrfToken = this.cryptoService.generateCsrfToken();
      response.setCookie('csrf-token', csrfToken, {
        httpOnly: false,
        secure: this.configService.get('NODE_ENV') === 'production',
        sameSite: 'lax', // Use 'lax' for better compatibility in development
        path: '/',
      });
    }

    // Set security headers
    response.header('X-Content-Type-Options', 'nosniff');
    response.header('X-Frame-Options', 'DENY');
    response.header('X-XSS-Protection', '1; mode=block');
    response.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    response.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // Remove sensitive headers
    response.removeHeader('X-Powered-By');
    response.removeHeader('Server');

    return next.handle().pipe(
      tap(() => {
        // Additional headers can be set here after the response is generated
      }),
    );
  }
}
