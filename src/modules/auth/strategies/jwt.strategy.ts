import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { SessionService } from '../services/session.service';
import { JwtPayload } from '../interfaces/auth.interfaces';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    cfg: ConfigService,
    private readonly usersService: UsersService,
    private readonly sessionService: SessionService,
  ) {
    const issuer = cfg.get<string>('JWT_ISSUER', 'procurementflow');
    const audience = cfg.get<string>('JWT_AUDIENCE', 'procurementflow://web');
    const secret = cfg.get<string>('JWT_SECRET', '');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      algorithms: ['HS256'],
      issuer,
      audience,
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload?.sub || !payload?.sessionId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Validate session by ID
    const isValidSession = await this.sessionService.validateSessionById(payload.sessionId);
    if (!isValidSession) {
      throw new UnauthorizedException('Session expired or invalid');
    }

    // Get user
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    // Attach sessionId and permissions to user object for use in controllers
    return { ...user, sessionId: payload.sessionId, permissions: payload.permissions };
  }
}
