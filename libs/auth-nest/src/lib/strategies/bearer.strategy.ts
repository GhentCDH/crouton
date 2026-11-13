import type { CroutonUser } from '@crouton/auth';
import { Injectable, type Type } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-bearer';

export const BEARER_STRATEGY_SUFFIX = '-bearer';

export type TokenVerifier = (token: string) => Promise<CroutonUser | null>;

export const createBearerStrategy = (strategyName: string, verify: TokenVerifier): Type<unknown> => {
  @Injectable()
  class BearerStrategyDynamic extends PassportStrategy(Strategy, `${strategyName}${BEARER_STRATEGY_SUFFIX}`) {
    async validate(token: string): Promise<unknown> {
      return verify(token);
    }
  }

  return BearerStrategyDynamic;
};
