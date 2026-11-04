import { type VerifierOptions, createOidcVerifier } from '@crouton/auth/server';
import { Injectable, type Type } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-bearer';

export const BEARER_STRATEGY_SUFFIX = '-bearer';

export const createBearerStrategy = (strategyName: string, opts: VerifierOptions): Type<unknown> => {
  const verify = createOidcVerifier(opts);

  @Injectable()
  class BearerStrategyDynamic extends PassportStrategy(Strategy, `${strategyName}${BEARER_STRATEGY_SUFFIX}`) {
    async validate(token: string): Promise<unknown> {
      return verify(token);
    }
  }

  return BearerStrategyDynamic;
};
