import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export type AgentFilesManifest = Record<string, { version: string; hash: string }>;

const MANIFEST_REL = '.crouton/agent-files.json';

export const hashContent = (content: string): string =>
  createHash('sha256').update(content).digest('hex');

export const loadManifest = async (projectDir: string): Promise<AgentFilesManifest> => {
  try {
    return JSON.parse(await readFile(join(projectDir, MANIFEST_REL), 'utf-8')) as AgentFilesManifest;
  } catch {
    return {};
  }
};

export const saveManifest = async (projectDir: string, manifest: AgentFilesManifest): Promise<void> => {
  const path = join(projectDir, MANIFEST_REL);
  await mkdir(join(projectDir, '.crouton'), { recursive: true });
  await writeFile(path, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');
};
