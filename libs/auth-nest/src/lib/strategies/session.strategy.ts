import { verifySession } from '@crouton/auth/server';
import { Injectable, type Type } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-bearer';

/** Passport name of the strategy accepting crouton-signed session JWTs. */
export const SESSION_STRATEGY = 'crouton-session';

export const createSessionStrategy = (secret: string): Type<unknown> => {
  @Injectable()
  class SessionStrategy extends PassportStrategy(Strategy, SESSION_STRATEGY) {
    async validate(token: string): Promise<unknown> {
      return verifySession(token, secret);
    }
  }
  return SessionStrategy;
};
