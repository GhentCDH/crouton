import {
  type AuthEndpointResponse,
  type CroutonUser,
  type LoadedProvider,
  buildPublicAuthConfig,
} from '@crouton/auth';
import { Controller, Get, Inject, Req, Res, UseGuards } from '@nestjs/common';

import { ProviderOAuth2Guard } from './provider-oauth2.guard';
import type { OAuthCallbackUser } from './strategies/google.strategy';

@Controller('_app')
export class AuthController {
  constructor(@Inject('CROUTON_AUTH_PROVIDERS') private readonly providers: LoadedProvider[]) {}

  @Get('auth')
  getAuthConfig(@Req() req: { user?: CroutonUser }): AuthEndpointResponse {
    return buildPublicAuthConfig(this.providers, !!req.user);
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

  /** OAuth2 callback — exchanges code for tokens and redirects frontend with access_token. */
  @Get('auth/:provider/callback')
  @UseGuards(ProviderOAuth2Guard)
  callback(
    @Req() req: { user?: OAuthCallbackUser },
    @Res() res: { redirect: (url: string) => void },
  ): void {
    const accessToken = req.user?.accessToken;
    const frontendUrl = process.env['CROUTON_FRONTEND_URL'] ?? '/';
    const redirect = accessToken
      ? `${frontendUrl}?access_token=${encodeURIComponent(accessToken)}`
      : frontendUrl;
    res.redirect(redirect);
  }
}
