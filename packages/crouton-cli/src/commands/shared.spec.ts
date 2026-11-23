import { afterEach, describe, expect, it, vi } from 'vitest';

import * as codegen from '@ghentcdh/crouton-codegen';

import { resolveTargetProject } from './shared';

vi.mock('@ghentcdh/crouton-codegen', () => ({
  findConfigPath: vi.fn(async () => undefined),
  discoverProjects: vi.fn(async () => [
    { name: 'a', root: '/ws/a', configPath: '/ws/a/crouton.json' },
    { name: 'b', root: '/ws/b', configPath: '/ws/b/crouton.json' },
  ]),
}));

describe('resolveTargetProject (#624)', () => {
  const isTTY = process.stdin.isTTY;
  afterEach(() => {
    process.stdin.isTTY = isTTY;
  });

  it('fails instead of prompting when stdin is not a TTY', async () => {
    process.stdin.isTTY = false;
    await expect(resolveTargetProject({ cwd: '/ws' })).rejects.toThrow(/Multiple crouton projects.*--project/);
    expect(codegen.discoverProjects).toHaveBeenCalled();
  });
});

describe('resolveTargetProject --project <path>', () => {
  it('accepts a nested path that holds crouton.json', async () => {
    vi.mocked(codegen.findConfigPath).mockResolvedValueOnce('/ws/apps/ms-service/crouton.json');
    await expect(resolveTargetProject({ cwd: '/ws', project: 'apps/ms-service' })).resolves.toBe('/ws/apps/ms-service');
  });

  it('ignores a config found further up and falls back to name matching', async () => {
    vi.mocked(codegen.findConfigPath).mockResolvedValueOnce('/ws/crouton.json');
    await expect(resolveTargetProject({ cwd: '/ws', project: 'nope' })).rejects.toThrow(/Unknown project "nope"/);
  });
});
