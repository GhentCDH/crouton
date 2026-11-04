import type { CroutonUser } from '@crouton/auth';
import { Injectable, type Type, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-http-bearer';

export const createDevStrategy = (strategyName: string, devToken: string): Type<unknown> => {
  @Injectable()
  class DevStrategyDynamic extends PassportStrategy(Strategy, `${strategyName}-bearer`) {
    validate(token: string): CroutonUser {
      if (token !== devToken) throw new UnauthorizedException();
      return {
        id: 'dev-user',
        email: 'dev@localhost',
        name: 'Dev User',
        roles: [],
        provider: strategyName,
        claims: {},
      };
    }
  }

  return DevStrategyDynamic;
};
