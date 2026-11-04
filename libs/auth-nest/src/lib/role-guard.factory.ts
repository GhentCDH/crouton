import { evaluateGuard } from '@crouton/auth';
import type { CroutonUser, LoadedProvider, RoleGuard } from '@crouton/auth';
import { type CanActivate, type ExecutionContext, Injectable, type Type } from '@nestjs/common';

export const createAuthenticatedGuard = (): Type<CanActivate> => {
  @Injectable()
  class AuthenticatedGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest<{ user?: CroutonUser }>();
      return !!req.user;
    }
  }
  Object.defineProperty(AuthenticatedGuard, 'name', { value: 'AuthenticatedGuard' });
  return AuthenticatedGuard;
};

export const createRoleGuard = (guardName: string, guardDef: RoleGuard): Type<CanActivate> => {
  @Injectable()
  class RoleGuardClass implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
      const req = context.switchToHttp().getRequest<{ user?: CroutonUser }>();
      if (!req.user) return false;
      return evaluateGuard(guardDef, req.user.roles);
    }
  }
  Object.defineProperty(RoleGuardClass, 'name', { value: `${guardName}Guard` });
  return RoleGuardClass;
};

export const buildGuardClasses = (
  providers: LoadedProvider[],
): Record<string, Type<CanActivate>> => {
  const result: Record<string, Type<CanActivate>> = {
    authenticated: createAuthenticatedGuard(),
  };
  for (const provider of providers) {
    for (const [name, def] of Object.entries(provider.config.guards ?? {})) {
      if (result[name]) throw new Error(`Auth guard name clash: "${name}" defined in multiple providers`);
      result[name] = createRoleGuard(name, def);
    }
  }
  return result;
};
