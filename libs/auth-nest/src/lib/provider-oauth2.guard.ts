import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Dynamic guard that reads the `:provider` route param and runs passport.authenticate()
 * against the matching OAuth2 strategy. Handles both login initiation (302 redirect)
 * and the callback (populates req.user).
 */
@Injectable()
export class ProviderOAuth2Guard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ params: { provider?: string } }>();
    const providerName = req.params['provider'];
    if (!providerName) return false;

    // Delegate to a dynamically-named AuthGuard for this provider
    const guard = new (AuthGuard(providerName))();
    return guard.canActivate(context) as Promise<boolean>;
  }
}
