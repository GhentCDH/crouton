import { Injectable, type Type } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { type Profile, Strategy, type VerifyCallback } from 'passport-google-oauth20';

export type GoogleStrategyEnv = {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
};

export type OAuthCallbackUser = {
  id: string;
  email?: string;
  name?: string;
  provider: string;
  accessToken: string;
};

export const createGoogleStrategy = (strategyName: string, env: GoogleStrategyEnv): Type<unknown> => {
  @Injectable()
  class GoogleStrategyDynamic extends PassportStrategy(Strategy, strategyName) {
    constructor() {
      super({
        clientID: env.clientId,
        clientSecret: env.clientSecret,
        callbackURL: env.callbackUrl,
        scope: ['email', 'profile'],
      });
    }

    validate(accessToken: string, _refreshToken: string, profile: Profile, done: VerifyCallback): void {
      const user: OAuthCallbackUser = {
        id: profile.id,
        email: profile.emails?.[0]?.value,
        name: profile.displayName,
        provider: strategyName,
        accessToken,
      };
      done(null, user);
    }
  }

  return GoogleStrategyDynamic;
};
