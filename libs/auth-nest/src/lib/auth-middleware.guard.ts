import type { CroutonUser, LoadedProvider } from '@crouton/auth';
import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { BEARER_STRATEGY_SUFFIX } from './strategies/bearer.strategy';

@Injectable()
export class CroutonAuthMiddlewareGuard implements CanActivate {
  private readonly bearerGuard: CanActivate;

  constructor(providers: LoadedProvider[]) {
    const strategyNames = providers.map((p) => `${p.strategyName}${BEARER_STRATEGY_SUFFIX}`);
    this.bearerGuard = new (AuthGuard(strategyNames))();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      await (this.bearerGuard.canActivate(context) as Promise<boolean>);
    } catch {
      // No valid Bearer token — leave req.user undefined (not authenticated).
      // Route-level guards handle the actual authorization check.
      const req = context
        .switchToHttp()
        .getRequest<{ user?: CroutonUser }>();
      req.user = undefined;
    }
    return true;
  }
}
