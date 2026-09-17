export type DynamicDefaultToken = '$now' | '$today' | '$user.id';

export type DefaultTokenContext = {
  user?: { id?: string };
};

const DYNAMIC_DEFAULTS: Record<string, (ctx: DefaultTokenContext) => unknown> =
  {
    $now: () => new Date().toISOString(),
    $today: () => new Date().toISOString().slice(0, 10),
    '$user.id': (ctx) => ctx.user?.id,
  };

const resolveValue = (value: unknown, ctx: DefaultTokenContext): unknown => {
  if (typeof value !== 'string') return value;
  const resolver = DYNAMIC_DEFAULTS[value];
  return resolver ? resolver(ctx) : value;
};

/**
 * Walk a parsed form value object and resolve any dynamic default tokens
 * (e.g. "$today", "$now", "$user.id") to their runtime equivalents.
 *
 * Must run at form-open time, not at schema-load time, so defaults are fresh.
 */
export const resolveDefaultTokens = (
  value: unknown,
  ctx: DefaultTokenContext = {},
): unknown => {
  if (Array.isArray(value)) return value.map((v) => resolveDefaultTokens(v, ctx));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        resolveDefaultTokens(v, ctx),
      ]),
    );
  }
  return resolveValue(value, ctx);
};
