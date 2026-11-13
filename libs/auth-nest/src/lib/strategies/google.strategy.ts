import { Injectable, type Type } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';

export type GoogleStrategyEnv = {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
};

/** Tokens handed to the callback controller, which verifies them and issues a crouton session. */
export type OAuthCallbackUser = {
  idToken?: string;
  accessToken?: string;
};

export const createGoogleStrategy = (strategyName: string, env: GoogleStrategyEnv): Type<unknown> => {
  // callbackArity=true → passport-oauth2 sees a 5-arg verify and passes the raw token `params` (with id_token).
  @Injectable()
  class GoogleStrategyDynamic extends PassportStrategy(Strategy, strategyName, true) {
    constructor() {
      super({
        clientID: env.clientId,
        clientSecret: env.clientSecret,
        callbackURL: env.callbackUrl,
        scope: ['openid', 'email', 'profile'],
      });
    }

    validate(_accessToken: string, _refreshToken: string, params: { id_token?: string }, _profile: unknown): OAuthCallbackUser {
      return { idToken: params.id_token };
    }
  }

  return GoogleStrategyDynamic;
};
