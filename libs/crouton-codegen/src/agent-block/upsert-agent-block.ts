// Updates the <!-- crouton configuration start/end --> block in AGENTS.md.
// Idempotent: running twice produces no diff.

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const START = '<!-- crouton configuration start -->';
const END = '<!-- crouton configuration end -->';

const wrap = (content: string): string => `${START}\n${content}\n${END}\n`;

export const upsertAgentBlock = async (filePath: string, content: string): Promise<void> => {
  const block = wrap(content);

  if (!existsSync(filePath)) {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, block, 'utf-8');
    return;
  }

  const existing = await readFile(filePath, 'utf-8');
  const startIdx = existing.indexOf(START);
  const endIdx = existing.indexOf(END);

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const replaced =
      existing.slice(0, startIdx) +
      block +
      existing.slice(endIdx + END.length).replace(/^\n/, '');
    if (replaced !== existing) await writeFile(filePath, replaced, 'utf-8');
    return;
  }

  const appended = existing.endsWith('\n') ? `${existing}${block}` : `${existing}\n\n${block}`;
  await writeFile(filePath, appended, 'utf-8');
};

export const ensureClaudeMd = async (filePath: string): Promise<void> => {
  if (!existsSync(filePath)) {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, '@AGENTS.md\n', 'utf-8');
  }
};
