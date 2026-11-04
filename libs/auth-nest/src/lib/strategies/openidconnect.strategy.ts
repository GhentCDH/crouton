import { Injectable, type Type } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { type Profile, Strategy, type VerifyCallback } from 'passport-openidconnect';

import type { OAuthCallbackUser } from './google.strategy';

export type OidcStrategyEnv = {
  issuer: string;
  authorizationUrl: string;
  tokenUrl: string;
  userinfoUrl: string;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  scope?: string[];
};

export const createOidcStrategy = (strategyName: string, env: OidcStrategyEnv): Type<unknown> => {
  @Injectable()
  class OidcStrategyDynamic extends PassportStrategy(Strategy, strategyName) {
    constructor() {
      super({
        issuer: env.issuer,
        authorizationURL: env.authorizationUrl,
        tokenURL: env.tokenUrl,
        userInfoURL: env.userinfoUrl,
        clientID: env.clientId,
        clientSecret: env.clientSecret,
        callbackURL: env.callbackUrl,
        scope: env.scope ?? ['openid', 'profile', 'email'],
        skipUserProfile: false,
      });
    }

    validate(
      _issuer: string,
      profile: Profile,
      _context: object,
      _idToken: string | object,
      accessToken: string | object,
      _refreshToken: string,
      done: VerifyCallback,
    ): void {
      const user: OAuthCallbackUser = {
        id: profile.id,
        email: (profile as unknown as { emails?: Array<{ value: string }> }).emails?.[0]?.value,
        name: profile.displayName,
        provider: strategyName,
        accessToken: String(accessToken),
      };
      done(null, user);
    }
  }

  return OidcStrategyDynamic;
};
