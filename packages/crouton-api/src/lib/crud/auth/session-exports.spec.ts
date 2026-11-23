import { describe, expect, it } from 'vitest';

import { type CroutonUser, signSession, verifySession } from './index';

describe('session re-exports (#620)', () => {
  it('signs and verifies a crouton session through @ghentcdh/crouton-api', async () => {
    const user: CroutonUser = { id: 'u1', email: 'a@b.c', roles: ['admin'], provider: 'google', claims: {} };
    const token = await signSession(user, 'test-secret');
    await expect(verifySession(token, 'test-secret')).resolves.toMatchObject({ id: 'u1', email: 'a@b.c', roles: ['admin'] });
  });
});
