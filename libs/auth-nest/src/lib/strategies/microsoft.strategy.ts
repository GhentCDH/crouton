import { Injectable, type Type } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { type Profile, Strategy, type VerifyCallback } from 'passport-microsoft';

import type { OAuthCallbackUser } from './google.strategy';

export type MicrosoftStrategyEnv = {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
};

export const createMicrosoftStrategy = (strategyName: string, env: MicrosoftStrategyEnv): Type<unknown> => {
  @Injectable()
  class MicrosoftStrategyDynamic extends PassportStrategy(Strategy, strategyName) {
    constructor() {
      super({
        clientID: env.clientId,
        clientSecret: env.clientSecret,
        callbackURL: env.callbackUrl,
        scope: ['user.read'],
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

  return MicrosoftStrategyDynamic;
};
