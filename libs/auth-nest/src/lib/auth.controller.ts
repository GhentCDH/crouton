import { type AuthEndpointResponse, type CroutonUser, type LoadedProvider, buildPublicAuthConfig } from '@crouton/auth';
import { Controller, Get, Inject, Req } from '@nestjs/common';

@Controller('_app')
export class AuthController {
  constructor(@Inject('CROUTON_AUTH_PROVIDERS') private readonly providers: LoadedProvider[]) {}

  @Get('auth')
  getAuthConfig(): AuthEndpointResponse {
    return buildPublicAuthConfig(this.providers);
  }

  @Get('me')
  getMe(@Req() req: { user?: CroutonUser }): CroutonUser | null {
    return req.user ?? null;
  }
}
