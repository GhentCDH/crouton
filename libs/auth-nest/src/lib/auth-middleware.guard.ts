import type { CroutonUser, LoadedProvider } from '@crouton/auth';
import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { BEARER_STRATEGY_SUFFIX } from './strategies/bearer.strategy';
import { createStrategiesForProvider } from './strategy-loader';

@Injectable()
export class CroutonAuthMiddlewareGuard implements CanActivate {
  private readonly bearerGuard: CanActivate;

  constructor(providers: LoadedProvider[]) {
    // Instantiate each bearer strategy — the PassportStrategy base constructor
    // registers it with Passport's global registry under its name.
    for (const provider of providers) {
      const { bearer } = createStrategiesForProvider(provider);
      new bearer(); // eslint-disable-line no-new
    }

    const strategyNames = providers.map((p) => `${p.strategyName}${BEARER_STRATEGY_SUFFIX}`);
    this.bearerGuard = new (AuthGuard(strategyNames))();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      await (this.bearerGuard.canActivate(context) as Promise<boolean>);
    } catch {
      // No valid Bearer token — leave req.user undefined (not authenticated).
      // Route-level guards handle the actual authorization check.
      const req = context.switchToHttp().getRequest<{ user?: CroutonUser }>();
      req.user = undefined;
    }
    return true;
  }
}
