import { describe, expect, it } from 'vitest';

import { hashContent, loadManifest, saveManifest } from './manifest';
import { renderAgentFile } from './render';
import { syncAgentFiles } from './sync';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';


const CTX = { resourcesDir: 'src/resources', dataSourcesDir: 'src/data-sources', version: '0.0.1-alpha.99' };
const TEMPLATE = '---\nname: crouton\ncrouton-version: 0.0.0\n---\nresources: <resourcesDir>\ndata: <dataSourcesDir>\n';

const mkTmp = () => mkdtemp(join(tmpdir(), 'crouton-test-'));

const makeAgentFilesDir = async (dir: string): Promise<string> => {
  const af = join(dir, 'agent-files');
  await mkdir(join(af, '.claude/skills/crouton'), { recursive: true });
  await writeFile(join(af, '.claude/skills/crouton/SKILL.md'), TEMPLATE, 'utf-8');
  return af;
};

describe('renderAgentFile', () => {
  it('fills placeholders', () => {
    const out = renderAgentFile(TEMPLATE, CTX);
    expect(out).toContain('src/resources');
    expect(out).toContain('src/data-sources');
    expect(out).not.toContain('<resourcesDir>');
  });

  it('updates crouton-version in frontmatter', () => {
    const out = renderAgentFile(TEMPLATE, CTX);
    expect(out).toContain('crouton-version: 0.0.1-alpha.99');
    expect(out).not.toContain('crouton-version: 0.0.0');
  });

  it('leaves body unchanged when no frontmatter', () => {
    const plain = 'just text <resourcesDir>';
    expect(renderAgentFile(plain, CTX)).toBe('just text src/resources');
  });
});

describe('manifest', () => {
  it('returns {} when file missing', async () => {
    const dir = await mkTmp();
    expect(await loadManifest(dir)).toEqual({});
  });

  it('round-trips save/load', async () => {
    const dir = await mkTmp();
    const m = { 'a.md': { version: '1.0', hash: 'abc' } };
    await saveManifest(dir, m);
    expect(await loadManifest(dir)).toEqual(m);
  });

  it('hashContent is deterministic', () => {
    expect(hashContent('hello')).toBe(hashContent('hello'));
    expect(hashContent('hello')).not.toBe(hashContent('world'));
  });
});

describe('syncAgentFiles', () => {
  it('fresh project — writes files and manifest', async () => {
    const projectDir = await mkTmp();
    const agentFilesDir = await makeAgentFilesDir(await mkTmp());
    const results = await syncAgentFiles({ projectDir, agentFilesDir, context: CTX, targets: ['claude'] });
    expect(results).toHaveLength(1);
    expect(results[0].action).toBe('written');
    const content = await readFile(join(projectDir, '.claude/skills/crouton/SKILL.md'), 'utf-8');
    expect(content).toContain('src/resources');
    const manifest = await loadManifest(projectDir);
    expect(Object.keys(manifest)).toHaveLength(1);
  });

  it('idempotent — second run returns no_change', async () => {
    const projectDir = await mkTmp();
    const agentFilesDir = await makeAgentFilesDir(await mkTmp());
    await syncAgentFiles({ projectDir, agentFilesDir, context: CTX, targets: ['claude'] });
    const results = await syncAgentFiles({ projectDir, agentFilesDir, context: CTX, targets: ['claude'] });
    expect(results[0].action).toBe('no_change');
  });

  it('user-edited file — skips + writes .new', async () => {
    const projectDir = await mkTmp();
    const agentFilesDir = await makeAgentFilesDir(await mkTmp());
    await syncAgentFiles({ projectDir, agentFilesDir, context: CTX, targets: ['claude'] });

    // Simulate user edit
    const dest = join(projectDir, '.claude/skills/crouton/SKILL.md');
    await writeFile(dest, 'user custom content', 'utf-8');

    // New version from upstream
    const newTemplate = TEMPLATE + '\nextra line\n';
    await writeFile(join(agentFilesDir, '.claude/skills/crouton/SKILL.md'), newTemplate, 'utf-8');

    const results = await syncAgentFiles({ projectDir, agentFilesDir, context: CTX, targets: ['claude'] });
    expect(results[0].action).toBe('skipped');
    // .new file should exist
    const newFiles = await readFile(join(projectDir, '.crouton/agent-files/.claude_skills_crouton_SKILL.md.new'), 'utf-8');
    expect(newFiles).toContain('extra line');
  });

  it('force — overwrites even when user edited', async () => {
    const projectDir = await mkTmp();
    const agentFilesDir = await makeAgentFilesDir(await mkTmp());
    await syncAgentFiles({ projectDir, agentFilesDir, context: CTX, targets: ['claude'] });
    await writeFile(join(projectDir, '.claude/skills/crouton/SKILL.md'), 'user edit', 'utf-8');
    const results = await syncAgentFiles({ projectDir, agentFilesDir, context: CTX, targets: ['claude'], force: true });
    expect(results[0].action).toBe('written');
  });

  it('dryRun — reports actions, writes nothing', async () => {
    const projectDir = await mkTmp();
    const agentFilesDir = await makeAgentFilesDir(await mkTmp());
    const results = await syncAgentFiles({ projectDir, agentFilesDir, context: CTX, targets: ['claude'], dryRun: true });
    expect(results[0].action).toBe('written');
    // But manifest should not exist
    expect(await loadManifest(projectDir)).toEqual({});
  });
});
