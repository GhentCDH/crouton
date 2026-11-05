import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';

import type { SecurityConfig } from '@ghentcdh/crouton-core';

import { SecurityGuardRegistry } from './security-guard.registry';

export const CROUTON_SECURITY = 'crouton:security';

@Injectable()
export class CroutonSecurityGuard implements CanActivate {
  constructor(private readonly registry: SecurityGuardRegistry) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const sec = Reflect.getMetadata(
      CROUTON_SECURITY,
      context.getHandler(),
    ) as SecurityConfig | undefined;

    // No metadata or explicitly public → allow.
    if (!sec || 'public' in sec) return true;

    const names = Array.isArray(sec.guard) ? sec.guard : [sec.guard];
    for (const name of names) {
      const cls = this.registry.resolve(name);
      const guard: CanActivate = new cls();
      const ok = await guard.canActivate(context);
      if (!ok) return false;
    }
    return true;
  }
}
