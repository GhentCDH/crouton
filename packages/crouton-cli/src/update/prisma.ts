/**
 * Thin wrappers around the project's Prisma CLI plus git/backup safety for the
 * destructive `db pull` step.
 */

import { spawn } from 'node:child_process';
import { copyFile } from 'node:fs/promises';

const run = (
  cmd: string,
  args: string[],
  cwd: string,
): Promise<{ code: number; stdout: string; stderr: string }> =>
  new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, shell: process.platform === 'win32' });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => (stdout += d.toString()));
    child.stderr?.on('data', (d) => (stderr += d.toString()));
    child.on('error', (err) => resolve({ code: 1, stdout, stderr: stderr + String(err) }));
    child.on('close', (code) => resolve({ code: code ?? 0, stdout, stderr }));
  });

/** True when the given path has uncommitted changes (or git is unavailable → treated as clean). */
export const isGitDirty = async (cwd: string, path: string): Promise<boolean> => {
  const { code, stdout } = await run('git', ['status', '--porcelain', '--', path], cwd);
  if (code !== 0) return false; // not a git repo / git missing — don't block
  return stdout.trim().length > 0;
};

/** Back up a schema file to `<schema>.bak` before a destructive pull. */
export const backupSchema = async (schemaPath: string): Promise<string> => {
  const dest = `${schemaPath}.bak`;
  await copyFile(schemaPath, dest);
  return dest;
};

export interface PrismaRunResult {
  ok: boolean;
  output: string;
}

/** `prisma db pull` against a specific schema, run in the project root. */
export const prismaDbPull = async (cwd: string, schemaPath: string): Promise<PrismaRunResult> => {
  const { code, stdout, stderr } = await run('npx', ['prisma', 'db', 'pull', '--schema', schemaPath], cwd);
  return { ok: code === 0, output: `${stdout}\n${stderr}`.trim() };
};

/** `prisma generate` (refreshes zod-prisma-types output). */
export const prismaGenerate = async (cwd: string, schemaPath: string): Promise<PrismaRunResult> => {
  const { code, stdout, stderr } = await run('npx', ['prisma', 'generate', '--schema', schemaPath], cwd);
  return { ok: code === 0, output: `${stdout}\n${stderr}`.trim() };
};
