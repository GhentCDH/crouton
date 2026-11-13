import {
  type AuthAppInfo,
  type AuthEndpointResponse,
  type CroutonUser,
  type LoadedProvider,
  buildPublicAuthConfig,
} from '@crouton/auth';
import { getSessionSecret, signSession } from '@crouton/auth/server';
import { Controller, Get, Inject, Optional, Param, Req, Res, UseGuards } from '@nestjs/common';

import { CroutonAuthMiddlewareGuard } from './auth-middleware.guard';
import { ProviderOAuth2Guard } from './provider-oauth2.guard';
import type { OAuthCallbackUser } from './strategies/google.strategy';

@Controller('_app')
export class AuthController {
  constructor(
    @Inject('CROUTON_AUTH_PROVIDERS') private readonly providers: LoadedProvider[],
    @Inject(CroutonAuthMiddlewareGuard) private readonly authGuard: CroutonAuthMiddlewareGuard,
    @Optional() @Inject('CROUTON_APP_INFO') private readonly app?: AuthAppInfo,
  ) {}

  @Get('auth')
  getAuthConfig(@Req() req: { user?: CroutonUser }): AuthEndpointResponse {
    return buildPublicAuthConfig(this.providers, !!req.user, this.app);
  }

  @Get('me')
  getMe(@Req() req: { user?: CroutonUser }): CroutonUser | null {
    return req.user ?? null;
  }

  /** Initiates the OAuth2 login flow for the named provider. */
  @Get('auth/:provider/login')
  @UseGuards(ProviderOAuth2Guard)
  login(): void {
    // Passport handles the redirect; this method is never reached.
  }

  /**
   * OAuth2 callback — verifies the provider's tokens, issues a crouton session JWT and
   * redirects to `<frontend>/auth/callback#token=…`. The token travels in the URL
   * fragment so it never reaches server logs or Referer headers.
   */
  @Get('auth/:provider/callback')
  @UseGuards(ProviderOAuth2Guard)
  async callback(
    @Param('provider') providerId: string,
    @Req() req: { user?: OAuthCallbackUser },
    @Res() res: { redirect: (url: string) => void },
  ): Promise<void> {
    const target = `${(process.env['CROUTON_FRONTEND_URL'] ?? '').replace(/\/$/, '')}/auth/callback`;
    const secret = getSessionSecret();
    const user = secret ? await this.authGuard.verifyLogin(providerId, req.user) : null;
    if (!user || !secret) {
      res.redirect(`${target}#error=access_denied`);
      return;
    }
    const token = await signSession(user, secret);
    res.redirect(`${target}#token=${encodeURIComponent(token)}&provider=${encodeURIComponent(providerId)}`);
  }
}
