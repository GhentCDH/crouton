import type { CroutonUser, LoadedProvider } from '@crouton/auth';
import { getSessionSecret } from '@crouton/auth/server';
import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { BEARER_STRATEGY_SUFFIX, type TokenVerifier } from './strategies/bearer.strategy';
import type { OAuthCallbackUser } from './strategies/google.strategy';
import { SESSION_STRATEGY, createSessionStrategy } from './strategies/session.strategy';
import { createStrategiesForProvider } from './strategy-loader';

@Injectable()
export class CroutonAuthMiddlewareGuard implements CanActivate {
  private readonly bearerGuard: CanActivate;
  private readonly verifiers = new Map<string, TokenVerifier>();

  constructor(providers: LoadedProvider[]) {
    // Instantiate each strategy — the PassportStrategy base constructor
    // registers it with Passport's global registry under its name.
    let hasOAuth2 = false;
    for (const provider of providers) {
      const { bearer, oauth, verify } = createStrategiesForProvider(provider);
      new bearer();
      if (oauth) {
        new oauth();
        hasOAuth2 = true;
      }
      if (verify) this.verifiers.set(provider.strategyName, verify);
    }

    const strategyNames = providers.map((p) => `${p.strategyName}${BEARER_STRATEGY_SUFFIX}`);
    const secret = getSessionSecret();
    if (hasOAuth2 && !secret) {
      throw new Error(
        'CROUTON_AUTH_SECRET must be set: an auth provider has OAuth2 login configured (client secret + callback URL), ' +
          'and server-side logins are issued as crouton-signed session tokens.',
      );
    }
    if (secret) {
      new (createSessionStrategy(secret))();
      strategyNames.unshift(SESSION_STRATEGY);
    }
    this.bearerGuard = new (AuthGuard(strategyNames))();
  }

  /** Verifies the tokens returned by a provider's OAuth2 callback (access token first, then ID token). */
  async verifyLogin(providerId: string, tokens: OAuthCallbackUser | undefined): Promise<CroutonUser | null> {
    const verify = this.verifiers.get(providerId);
    if (!verify || !tokens) return null;
    for (const token of [tokens.accessToken, tokens.idToken]) {
      const user = token ? await verify(token) : null;
      if (user) return user;
    }
    return null;
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
