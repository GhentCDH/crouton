import { CONFIG_FILES } from '@ghentcdh/crouton-core';

import { ensureClaudeMd, upsertAgentBlock } from '../agent-block/upsert-agent-block';
import { loadConfig } from '../config';
import { type AgentFilesManifest, hashContent, loadManifest, saveManifest } from './manifest';
import { renderAgentFile } from './render';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';

export type AgentFileSyncResult = {
  path: string;
  action: 'written' | 'skipped' | 'deleted' | 'no_change';
  reason?: string;
};

const collectFiles = async (dir: string, base: string = dir): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const e of entries) {
    const abs = join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...await collectFiles(abs, base));
    } else {
      files.push(relative(base, abs));
    }
  }
  return files;
};

export const syncAgentFiles = async (opts: {
  projectDir: string;
  agentFilesDir: string;
  context: { resourcesDir: string; dataSourcesDir: string; version: string };
  targets: ('claude' | 'cursor')[];
  force?: boolean;
  dryRun?: boolean;
}): Promise<AgentFileSyncResult[]> => {
  const manifest = await loadManifest(opts.projectDir);
  const newManifest: AgentFilesManifest = { ...manifest };
  const results: AgentFileSyncResult[] = [];

  const templateFiles = await collectFiles(opts.agentFilesDir).catch(() => [] as string[]);

  const activeFiles = templateFiles.filter((f) =>
    (opts.targets.includes('claude') && f.startsWith('.claude/')) ||
    (opts.targets.includes('cursor') && f.startsWith('.cursor/')),
  );

  for (const relPath of activeFiles) {
    const templatePath = join(opts.agentFilesDir, relPath);
    const destPath = join(opts.projectDir, relPath);

    const rawTemplate = await readFile(templatePath, 'utf-8');
    const rendered = renderAgentFile(rawTemplate, opts.context);
    const newHash = hashContent(rendered);
    const destExists = existsSync(destPath);

    if (!destExists || opts.force) {
      if (!opts.dryRun) {
        await mkdir(dirname(destPath), { recursive: true });
        await writeFile(destPath, rendered, 'utf-8');
        newManifest[relPath] = { version: opts.context.version, hash: newHash };
      }
      results.push({ path: relPath, action: 'written' });
      continue;
    }

    const existingContent = await readFile(destPath, 'utf-8');
    const existingHash = hashContent(existingContent);
    const entry = manifest[relPath];

    if (existingHash === newHash) {
      results.push({ path: relPath, action: 'no_change' });
      continue;
    }

    if (entry && existingHash === entry.hash) {
      // Untouched since last write — safe to update
      if (!opts.dryRun) {
        await writeFile(destPath, rendered, 'utf-8');
        newManifest[relPath] = { version: opts.context.version, hash: newHash };
      }
      results.push({ path: relPath, action: 'written' });
    } else {
      // User edited it — skip and write a .new file
      const newFileName = relPath.replace(/\//g, '_') + '.new';
      const newFilePath = join(opts.projectDir, '.crouton', 'agent-files', newFileName);
      if (!opts.dryRun) {
        await mkdir(dirname(newFilePath), { recursive: true });
        await writeFile(newFilePath, rendered, 'utf-8');
      }
      results.push({
        path: relPath,
        action: 'skipped',
        reason: `edited locally; new version written to .crouton/agent-files/${newFileName}`,
      });
    }
  }

  if (!opts.dryRun) {
    await saveManifest(opts.projectDir, newManifest);
  }

  return results;
};

/** Where agent files belong: the nearest Nx workspace root (`nx.json`) at or above `dir`, else `dir`. */
export const findAgentRoot = (dir: string): string => {
  for (let d = resolve(dir); ; d = dirname(d)) {
    if (existsSync(join(d, 'nx.json'))) return d;
    if (dirname(d) === d) return resolve(dir);
  }
};

/**
 * Write the crouton block in `AGENTS.md`, a `CLAUDE.md` pointing at it, and the
 * `.claude` / `.cursor` agent files into `rootDir`, for the crouton project at `projectDir`.
 * Paths in the files are relative to `rootDir`; `agentFiles.dir` in `crouton.json` overrides it.
 */
/** Crouton config dirs under `dir` (sorted). ponytail: depth-limited walk, add ignore globs if workspaces get deeper. */
const findProjectDirs = async (dir: string, depth = 4): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const found = entries.some((e) => e.isFile() && CONFIG_FILES.includes(e.name)) ? [dir] : [];
  if (depth === 0) return found;
  for (const e of entries) {
    if (!e.isDirectory() || e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'dist') continue;
    found.push(...await findProjectDirs(join(dir, e.name), depth - 1));
  }
  return found.sort();
};

/**
 * Write the crouton block in `AGENTS.md`, a `CLAUDE.md` pointing at it, and the
 * `.claude` / `.cursor` agent files into `rootDir`, for the crouton project at `projectDir`.
 * Paths in the files are relative to `rootDir`; `agentFiles.dir` in `crouton.json` overrides it.
 * With several projects sharing `rootDir`, the files list all of them instead of the last one run (#690).
 */
export const writeAgentFiles = async (opts: {
  projectDir: string;
  rootDir: string;
  agentFilesDir: string;
  version: string;
  dryRun?: boolean;
}): Promise<AgentFileSyncResult[]> => {
  const { config, root } = await loadConfig(opts.projectDir);
  const rootDir = config.agentFiles?.dir ? resolve(root, config.agentFiles.dir) : opts.rootDir;
  const rel = (from: string, p: string) => relative(rootDir, resolve(from, p)).split(sep).join('/') || '.';

  const projects = [{ root, config }];
  for (const dir of await findProjectDirs(rootDir)) {
    if (dir === root) continue;
    const other = await loadConfig(dir).catch(() => undefined);
    if (!other) continue;
    const otherRoot = other.config.agentFiles?.dir ? resolve(other.root, other.config.agentFiles.dir) : findAgentRoot(other.root);
    if (otherRoot === rootDir) projects.push(other);
  }
  const multi = projects.length > 1;

  const context = multi
    ? { resourcesDir: '<resourcesDir>', dataSourcesDir: '<dataSourcesDir>', version: opts.version }
    : { resourcesDir: rel(root, config.resourcesDir), dataSourcesDir: rel(root, config.dataSourcesDir), version: opts.version };
  const where = multi
    ? '- Crouton projects (`<resourcesDir>` / `<dataSourcesDir>` in the crouton skill = the dirs of the project you work on):\n' +
      projects
        .map((p) => ({ dir: rel(p.root, '.'), res: rel(p.root, p.config.resourcesDir), ds: rel(p.root, p.config.dataSourcesDir) }))
        .sort((a, b) => a.dir.localeCompare(b.dir))
        .map((p) => `  - \`${p.dir}\`: resources in \`${p.res}\`, data sources in \`${p.ds}\`\n`)
        .join('')
    : `- Resources live in \`${context.resourcesDir}\`, data sources in \`${context.dataSourcesDir}\` (see \`crouton.json\`).\n`;
  if (!opts.dryRun) {
    await upsertAgentBlock(
      join(rootDir, 'AGENTS.md'),
      '<!-- Leave the start & end comments to automatically receive updates. -->\n' +
        '# crouton\n' +
        where +
        '- Use the `crouton` skill for any resource/datasource change.\n' +
        `- After editing any \`resource.json\` or \`crouton.json\`, run \`crouton validate${multi ? ' --project <dir>' : ''}\`.\n` +
        '- Docs for the installed version: `node_modules/@ghentcdh/crouton-cli/agent-docs/README.md`',
    );
    await ensureClaudeMd(join(rootDir, 'CLAUDE.md'));
  }
  return syncAgentFiles({
    projectDir: rootDir,
    agentFilesDir: opts.agentFilesDir,
    context,
    targets: ['claude', 'cursor'],
    dryRun: opts.dryRun,
  });
};
