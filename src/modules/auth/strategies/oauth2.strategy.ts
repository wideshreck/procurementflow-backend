// src/modules/auth/strategies/oauth2.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import OAuth2Strategy, { VerifyCallback } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';

/**
 * Not: passport-oauth2 default olarak "profile" çekmez.
 * Sağlayıcınız destekliyorsa userInfoURL geçin veya "userProfile" override edin.
 */
@Injectable()
export class GenericOAuth2Strategy extends PassportStrategy(OAuth2Strategy, 'oauth2') {
  constructor(private readonly cfg: ConfigService) {
    const authorizationURL = cfg.get<string>('OAUTH2_AUTH_URL');
    const tokenURL = cfg.get<string>('OAUTH2_TOKEN_URL');
    const clientID = cfg.get<string>('OAUTH2_CLIENT_ID');
    const clientSecret = cfg.get<string>('OAUTH2_CLIENT_SECRET');
    const callbackURL = cfg.get<string>('OAUTH2_CALLBACK_URL');

    if (!authorizationURL || !tokenURL || !clientID || !clientSecret || !callbackURL) {
      throw new Error('OAuth2 environment variables are missing');
    }

    super({
      authorizationURL,
      tokenURL,
      clientID,
      clientSecret,
      callbackURL,
      scope: ['profile', 'email'],
      state: true,
      // userProfileURL: cfg.get<string>('OAUTH2_PROFILE_URL') ?? undefined, // varsa açın
    });
  }

  // accessToken/refreshToken ile kendi user lookup/create işleminizi yapın
  async validate(
    accessToken: string,
    refreshToken: string,
    _params: any,
    profile: any,
    done: VerifyCallback,
  ) {
    // TODO: Sağlayıcıya göre profile doldurma (userInfo endpoint kullanın)
    const user = {
      oauthProvider: 'generic',
      accessToken,
      refreshToken,
      profile: profile ?? null,
    };
    done(null, user);
  }
}
