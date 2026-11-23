import { currentAppPath, setAppBase } from '@crouton/auth-vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

const at = (pathname: string) => vi.stubGlobal('window', { location: { pathname } });

describe('auth app base', () => {
  afterEach(() => {
    setAppBase('');
    vi.unstubAllGlobals();
  });

  it('keeps paths unchanged without a base', () => {
    at('/auth/callback');
    expect(currentAppPath()).toBe('/auth/callback');
  });

  it('strips the router base', () => {
    setAppBase('/book/');
    at('/book/auth/callback');
    expect(currentAppPath()).toBe('/auth/callback');
    at('/book');
    expect(currentAppPath()).toBe('/');
    at('/bookshelf/auth/login');
    expect(currentAppPath()).toBe('/bookshelf/auth/login');
  });
});
