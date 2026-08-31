import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- runtime DI requires value imports
import { ModuleRef, Reflector } from '@nestjs/core';

import type { SecurityConfig } from '@ghentcdh/crouton-core';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports -- runtime DI requires value import
import { SecurityGuardRegistry } from './security-guard.registry';

export const CROUTON_SECURITY = 'crouton:security';

@Injectable()
export class CroutonSecurityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly registry: SecurityGuardRegistry,
    private readonly moduleRef: ModuleRef,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const sec = this.reflector.get<SecurityConfig | undefined>(
      CROUTON_SECURITY,
      context.getHandler(),
    );

    // No metadata or explicitly public → allow.
    if (!sec || 'public' in sec) return true;

    const names = Array.isArray(sec.guard) ? sec.guard : [sec.guard];
    for (const name of names) {
      const cls = this.registry.resolve(name);
      const guard = this.moduleRef.get(cls, { strict: false });
      const ok = await guard.canActivate(context);
      if (!ok) return false;
    }
    return true;
  }
}
