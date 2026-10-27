/**
 * The subset of an Express/NestJS request that crouton reads.
 * Hook and repository authors can cast `ctx.request` to this type to access
 * headers, params, query and user without depending on @nestjs/common or express.
 */
export interface CroutonRequest {
  user?: unknown;
  headers: Record<string, string | string[] | undefined>;
  params: Record<string, string>;
  query: Record<string, string | string[] | undefined>;
}
