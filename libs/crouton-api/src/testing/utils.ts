export { invalid } from '@ghentcdh/crouton-core/testing';

/** Read a supertest response body (typed `any` by supertest) as a record. */
export const bodyOf = (res: { body: unknown }): Record<string, unknown> =>
  res.body as Record<string, unknown>;
