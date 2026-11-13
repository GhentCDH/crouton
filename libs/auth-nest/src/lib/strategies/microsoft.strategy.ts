import { Injectable, type Type } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-microsoft';

import type { OAuthCallbackUser } from './google.strategy';

export type MicrosoftStrategyEnv = {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  tenant: string;
};

export const createMicrosoftStrategy = (
  strategyName: string,
  env: MicrosoftStrategyEnv,
): Type<unknown> => {
  // callbackArity=true → passport-oauth2 sees a 5-arg verify and passes the raw token `params` (with id_token).
  @Injectable()
  class MicrosoftStrategyDynamic extends PassportStrategy(Strategy, strategyName, true) {
    constructor() {
      super({
        clientID: env.clientId,
        clientSecret: env.clientSecret,
        callbackURL: env.callbackUrl,
        tenant: env.tenant,
        // user.read: passport-microsoft fetches the profile from Graph.
        scope: ['openid', 'profile', 'email', 'user.read'],
      });
    }

    validate(_accessToken: string, _refreshToken: string, params: { id_token?: string }, _profile: unknown): OAuthCallbackUser {
      return { idToken: params.id_token };
    }
  }

  return MicrosoftStrategyDynamic;
};
