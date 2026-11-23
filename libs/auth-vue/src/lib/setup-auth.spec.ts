import type { AxiosInstance } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const login = vi.fn();

vi.mock('./use-auth', () => ({
  CALLBACK_PATH: '/auth/callback',
  currentAppPath: () => '/public/page',
  loadOidcUser: vi.fn(),
  pickBrowserProvider: () => undefined,
  setAuthProviders: vi.fn(),
  setSessionToken: vi.fn(),
  setupBrowserProvider: vi.fn(),
  tryRenewOidcUser: vi.fn(),
  useAuth: () => ({ getToken: () => null, login }),
}));

const { setupAuth } = await import('./setup-auth');

/** Axios stub: `/_app/auth` lists one server-side (loginable) provider. */
const axiosStub = () =>
  ({
    defaults: {},
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    get: vi.fn(async () => ({ data: { providers: [{ id: 'google', loginMode: 'server' }], app: {} } })),
  }) as unknown as AxiosInstance;

describe('setupAuth requireLogin (#618)', () => {
  beforeEach(() => login.mockClear());

  it('logs in without a session by default', async () => {
    await setupAuth('', axiosStub());
    expect(login).toHaveBeenCalledOnce();
  });

  it('skips the login when requireLogin is false', async () => {
    const { enabled } = await setupAuth('', axiosStub(), { requireLogin: false });
    expect(enabled).toBe(true);
    expect(login).not.toHaveBeenCalled();
  });

  it('asks a requireLogin function with the current app path', async () => {
    const requireLogin = vi.fn((path: string) => path.startsWith('/admin'));
    await setupAuth('', axiosStub(), { requireLogin });
    expect(requireLogin).toHaveBeenCalledWith('/public/page');
    expect(login).not.toHaveBeenCalled();
  });
});
