import type { RoleGuard } from './schema';

export const evaluateGuard = (guard: RoleGuard, roles: string[]): boolean => {
  if (Array.isArray(guard)) return guard.some((r) => roles.includes(r));
  const anyOf = guard.anyOf ? guard.anyOf.some((r) => roles.includes(r)) : true;
  const allOf = guard.allOf ? guard.allOf.every((r) => roles.includes(r)) : true;
  return anyOf && allOf;
};
