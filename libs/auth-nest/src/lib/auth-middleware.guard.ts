import type { CroutonUser, LoadedProvider } from '@crouton/auth';
import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class CroutonAuthMiddlewareGuard implements CanActivate {
  constructor(private readonly providers: LoadedProvider[]) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined>; user?: CroutonUser }>();
    req.user = await this.authenticate(req);
    return true;
  }

  private async authenticate(req: { headers: Record<string, string | string[] | undefined> }): Promise<CroutonUser | undefined> {
    for (const provider of this.providers) {
      const user = await provider.adapter.authenticate(req);
      if (user) return user;
    }
    return undefined;
  }
}
