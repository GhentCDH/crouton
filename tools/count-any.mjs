#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const PACKAGES_DIR = join(ROOT, 'packages');
const BASELINE_PATH = join(ROOT, 'tools/any-baseline.json');
const SKIP = new Set(['crouton-editor-vue']);

const isSpec = (p) => /\.(spec|test)\.(ts|vue)$/.test(p);

const extractScript = (src) => {
  const m = src.match(/<script(?:\s[^>]*)?>(\s*[\s\S]*?)<\/script>/);
  return m ? m[1] : '';
};

const zeroCounts = () => ({ explicit_any: 0, as_any: 0, as_unknown_as: 0, disable_no_reason: 0 });

const addCounts = (a, b) => ({
  explicit_any: a.explicit_any + b.explicit_any,
  as_any: a.as_any + b.as_any,
  as_unknown_as: a.as_unknown_as + b.as_unknown_as,
  disable_no_reason: a.disable_no_reason + b.disable_no_reason,
});

const countContent = (src) => ({
  explicit_any: (src.match(/\bany\b/g) ?? []).length,
  as_any: (src.match(/\bas\s+any\b/g) ?? []).length,
  as_unknown_as: (src.match(/\bas\s+unknown\s+as\b/g) ?? []).length,
  // disable line for no-explicit-any with no -- reason after the rule name
  disable_no_reason: (src.match(/\/\/\s*eslint-disable(?:-next-line)?\b[^\n]*\bno-explicit-any\b(?!.*--)/g) ?? []).length,
});

const walk = (dir, exts, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.git') continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, exts, out);
    else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
};

const countPackage = (pkgDir) => {
  const files = walk(pkgDir, ['.ts', '.vue']);
  let prod = zeroCounts(), spec = zeroCounts();
  for (const f of files) {
    const raw = readFileSync(f, 'utf8');
    const src = f.endsWith('.vue') ? extractScript(raw) : raw;
    if (!src) continue;
    const c = countContent(src);
    if (isSpec(f)) spec = addCounts(spec, c);
    else prod = addCounts(prod, c);
  }
  return { prod, spec };
};

const packages = readdirSync(PACKAGES_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !SKIP.has(e.name))
  .map((e) => e.name)
  .sort();

const current = Object.fromEntries(packages.map((p) => [p, countPackage(join(PACKAGES_DIR, p))]));

const printTable = (data) => {
  const cols = ['package', 'any(prod)', 'as any', 'as unk as', 'disable', 'any(spec)'];
  const rows = Object.entries(data).map(([p, { prod, spec }]) => [
    p, prod.explicit_any, prod.as_any, prod.as_unknown_as, prod.disable_no_reason, spec.explicit_any,
  ]);
  const w = cols.map((c, i) => Math.max(c.length, ...rows.map((r) => String(r[i]).length)));
  const row = (r) => r.map((v, i) => String(v).padEnd(w[i])).join('  ');
  console.log(row(cols));
  console.log(w.map((n) => '-'.repeat(n)).join('  '));
  for (const r of rows) console.log(row(r));
};

printTable(current);

const mode = process.argv.includes('--check') ? 'check' : process.argv.includes('--update') ? 'update' : null;

if (mode === 'check') {
  if (!existsSync(BASELINE_PATH)) { console.error('No baseline. Run --update first.'); process.exit(1); }
  const base = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
  let fail = false;
  for (const [pkg, { prod, spec }] of Object.entries(current)) {
    const b = base[pkg];
    if (!b) continue;
    for (const k of Object.keys(prod)) {
      if (prod[k] > (b.prod?.[k] ?? Infinity)) { console.error(`FAIL ${pkg} prod.${k}: ${prod[k]} > ${b.prod[k]}`); fail = true; }
      if (spec[k] > (b.spec?.[k] ?? Infinity)) { console.error(`FAIL ${pkg} spec.${k}: ${spec[k]} > ${b.spec[k]}`); fail = true; }
    }
  }
  if (fail) process.exit(1);
  console.log('✓ All counts within baseline.');
} else if (mode === 'update') {
  const base = existsSync(BASELINE_PATH) ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) : {};
  for (const [pkg, { prod, spec }] of Object.entries(current)) {
    const prev = base[pkg] ?? { prod: {}, spec: {} };
    base[pkg] = {
      prod: Object.fromEntries(Object.keys(prod).map((k) => [k, Math.min(prod[k], prev.prod?.[k] ?? prod[k])])),
      spec: Object.fromEntries(Object.keys(spec).map((k) => [k, Math.min(spec[k], prev.spec?.[k] ?? spec[k])])),
    };
  }
  writeFileSync(BASELINE_PATH, JSON.stringify(base, null, 2) + '\n');
  console.log(`Baseline written → ${BASELINE_PATH}`);
}
