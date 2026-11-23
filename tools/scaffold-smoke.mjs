#!/usr/bin/env node
// Scaffold a project with the local create-crouton build, install the local
// crouton packages (packed like npm publish would), then build + typecheck + lint it.
// Catches template/API drift before a release. Usage: node tools/scaffold-smoke.mjs [outDir]
// Expects the release projects to be built (`pnpm nx run-many -t build`).
import { execSync } from 'node:child_process';
import { appendFileSync, mkdirSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..');
const out = resolve(process.argv[2] ?? mkdtempSync(join(tmpdir(), 'crouton-smoke-')));
const tgzDir = join(out, 'tgz');
const app = join(out, 'app');
const PACKAGES = ['crouton-core', 'crouton-vue', 'crouton-api', 'create-crouton', 'crouton-prisma', 'crouton-cli', 'crouton-auth'];

const run = (cmd, cwd) => {
  console.log(`\n$ ${cmd}   (${cwd})`);
  execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, NX_DAEMON: 'false', CI: 'true' } });
};

mkdirSync(tgzDir, { recursive: true });
for (const p of PACKAGES) run(`pnpm pack --pack-destination ${tgzDir}`, join(repo, 'packages', p));

run(`node ${join(repo, 'packages/create-crouton/dist/index.js')} app --nx -y --sample --no-install --no-git`, out);

// Resolve @ghentcdh/* to the local tarballs instead of the registry.
const overrides = readdirSync(tgzDir)
  .map((f) => `  '${f.replace(/^ghentcdh-/, '@ghentcdh/').replace(/-\d.*\.tgz$/, '')}': file:${join(tgzDir, f)}`)
  .join('\n');
appendFileSync(join(app, 'pnpm-workspace.yaml'), `\noverrides:\n${overrides}\n`);

run('pnpm install --no-frozen-lockfile', app);
run('pnpm peers check', app);
run('pnpm exec prisma generate --config prisma/default/prisma.config.ts', app);
run('pnpm exec nx run-many -t build typecheck lint --output-style=static', app);
console.log(`\nScaffold smoke OK: ${app}`);
