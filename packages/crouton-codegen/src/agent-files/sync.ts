import { type AgentFilesManifest, hashContent, loadManifest, saveManifest } from './manifest';
import { renderAgentFile } from './render';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';

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
