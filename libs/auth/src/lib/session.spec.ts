import { describe, expect, it } from 'vitest';

import { signSession, verifySession } from './session';
import type { CroutonUser } from './types';

const user: CroutonUser = {
  id: 'u1',
  email: 'alice@ugent.be',
  name: 'Alice',
  roles: ['admin'],
  provider: 'google',
  claims: {},
};
const SECRET = 'test-secret-at-least-32-characters-long';

describe('session JWT', () => {
  it('sign → verify roundtrip keeps identity and roles', async () => {
    const token = await signSession(user, SECRET, '1h');
    expect(await verifySession(token, SECRET)).toMatchObject({
      id: 'u1',
      email: 'alice@ugent.be',
      name: 'Alice',
      roles: ['admin'],
      provider: 'google',
    });
  });

  it('keeps an http(s) picture and drops other schemes (#619)', async () => {
    const withPicture = await signSession({ ...user, picture: 'https://lh3.googleusercontent.com/a/x' }, SECRET, '1h');
    expect((await verifySession(withPicture, SECRET))?.picture).toBe('https://lh3.googleusercontent.com/a/x');

    const unsafe = await signSession({ ...user, picture: 'javascript:alert(1)' }, SECRET, '1h');
    expect((await verifySession(unsafe, SECRET))?.picture).toBeUndefined();
  });

  it('rejects an expired token', async () => {
    const token = await signSession(user, SECRET, '-1m');
    expect(await verifySession(token, SECRET)).toBeNull();
  });

  it('rejects a token signed with another secret', async () => {
    const token = await signSession(user, 'another-secret-at-least-32-characters');
    expect(await verifySession(token, SECRET)).toBeNull();
  });

  it('rejects garbage', async () => {
    expect(await verifySession('not.a.jwt', SECRET)).toBeNull();
  });
});
