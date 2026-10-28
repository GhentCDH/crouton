/**
 * Cast an unknown value to `T` — for test fixtures that are intentionally
 * partial or invalid. The cast is centralised here so specs never need
 * double casts.
 */
export const invalid = <T>(value: unknown): T => value as T;

/** Read a supertest response body (typed `any` by supertest) as a record. */
export const bodyOf = (res: { body: unknown }): Record<string, unknown> =>
  res.body as Record<string, unknown>;
