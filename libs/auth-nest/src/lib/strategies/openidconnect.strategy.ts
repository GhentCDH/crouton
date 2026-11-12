import { Injectable, type Type } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-openidconnect';

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
  // callbackArity=true → passport-openidconnect sees a 7-arg verify (issuer, profile, context, idToken, accessToken, refreshToken, done).
  @Injectable()
  class OidcStrategyDynamic extends PassportStrategy(Strategy, strategyName, true) {
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
      _profile: unknown,
      _context: object,
      idToken: string | object,
      accessToken: string | object,
      _refreshToken: string,
    ): OAuthCallbackUser {
      return {
        idToken: typeof idToken === 'string' ? idToken : undefined,
        accessToken: typeof accessToken === 'string' ? accessToken : undefined,
      };
    }
  }

  return OidcStrategyDynamic;
};
