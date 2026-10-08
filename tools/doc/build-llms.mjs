#!/usr/bin/env node
// Generates /llms.txt and /llms-full.txt from docs/guide/**/*.md
// Run after VuePress build, writes into the dist dir.

import fs from 'fs';
import path from 'path';

const GUIDE_DIR = 'docs/guide';
const BASE_URL = 'https://ghentcdh.github.io/crouton';
const DIST_DIR = 'docs/.vuepress/dist';

const EXCLUDE = ['_generated', 'node_modules', 'typedoc_sidebar.json'];

const extractFrontmatter = (content) => {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim().replace(/^["']|["']$/g, '');
    fm[key] = val;
  }
  return fm;
};

const extractTitle = (content, fm) => {
  if (fm.title) return fm.title;
  const h1 = content.match(/^#\s+(.+)/m);
  return h1 ? h1[1].trim() : null;
};

const extractDescription = (content, fm) => {
  if (fm.description) return fm.description;
  // First non-heading, non-empty, non-blockquote, non-code paragraph
  const lines = content.split('\n');
  let inFrontmatter = false;
  let fmDone = false;
  let inCode = false;
  for (const line of lines) {
    if (!fmDone && line.trim() === '---') { inFrontmatter = !inFrontmatter; if (!inFrontmatter) fmDone = true; continue; }
    if (!fmDone && inFrontmatter) continue;
    if (line.startsWith('```')) { inCode = !inCode; continue; }
    if (inCode) continue;
    const t = line.trim();
    if (!t || t.startsWith('#') || t.startsWith('>') || t.startsWith(':') || t.startsWith('|') || t.startsWith('!')) continue;
    // Skip "Last verified" lines
    if (t.startsWith('Last verified')) continue;
    return t.replace(/\*\*/g, '').replace(/`/g, '').slice(0, 160);
  }
  return null;
};

const fileToUrlPath = (filePath) => {
  // filePath relative to GUIDE_DIR, e.g. "1.getting-started/index.md"
  let p = filePath.replace(/\\/g, '/');
  p = p.replace(/\/(index|README)\.md$/, '/');
  p = p.replace(/^(README|index)\.md$/, '');
  p = p.replace(/\.md$/, '/');
  p = p.replace(/\/+$/, '');
  return `${BASE_URL}/guide/${p}`.replace(/\/$/, '') || `${BASE_URL}/guide/`;
};

const collectFiles = (dir, base = '') => {
  const entries = fs.readdirSync(dir).sort();
  const result = [];
  for (const entry of entries) {
    if (EXCLUDE.includes(entry)) continue;
    const full = path.join(dir, entry);
    const rel = base ? `${base}/${entry}` : entry;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      // index/README first, then rest
      const sub = collectFiles(full, rel);
      result.push(...sub);
    } else if (entry.endsWith('.md')) {
      result.push({ full, rel });
    }
  }
  // Put README/index at front of each group
  const idx = result.findIndex(f => f.rel === base + '/README.md' || f.rel === base + '/index.md');
  if (idx > 0) { const [item] = result.splice(idx, 1); result.unshift(item); }
  return result;
};

// Re-collect with index files first per directory
const collectOrdered = (dir) => {
  const entries = fs.readdirSync(dir).sort();
  const result = [];
  const dirs = [];
  const files = [];
  for (const entry of entries) {
    if (EXCLUDE.includes(entry)) continue;
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) dirs.push({ entry, full });
    else if (entry.endsWith('.md')) files.push({ entry, full });
  }
  // index/README first among files
  const indexFiles = files.filter(f => f.entry === 'README.md' || f.entry === 'index.md');
  const otherFiles = files.filter(f => f.entry !== 'README.md' && f.entry !== 'index.md');
  return [...indexFiles, ...otherFiles, ...dirs];
};

const walkGuide = (dir, relBase = '') => {
  const ordered = collectOrdered(dir);
  const results = [];
  for (const item of ordered) {
    const rel = relBase ? `${relBase}/${item.entry}` : item.entry;
    const stat = fs.statSync(item.full);
    if (stat.isDirectory()) {
      results.push(...walkGuide(item.full, rel));
    } else {
      results.push({ full: item.full, rel });
    }
  }
  return results;
};

const pages = walkGuide(GUIDE_DIR);

const parsed = pages.map(({ full, rel }) => {
  const content = fs.readFileSync(full, 'utf8');
  const fm = extractFrontmatter(content);
  const title = extractTitle(content, fm) ?? path.basename(rel, '.md');
  const description = extractDescription(content, fm);
  const url = fileToUrlPath(rel);
  return { title, description, url, content, rel };
});

const preamble = `# Crouton docs

Crouton is a resource-driven admin UI framework for NestJS + Vue 3. Configure resources as JSON, get a full CRUD admin interface.

## Docs

`;

const llmsTxt = preamble + parsed.map(({ title, description, url }) => {
  const lines = [`${title}: ${url}`];
  if (description) lines.push(`- ${description}`);
  return lines.join('\n');
}).join('\n\n');

const llmsFullTxt = parsed.map(({ title, url, content }) => {
  const body = content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '').trimStart();
  return `# ${title}\nURL: ${url}\n\n${body}`;
}).join('\n\n---\n\n');

const outDir = fs.existsSync(DIST_DIR) ? DIST_DIR : '/tmp/crouton-llms-out';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(path.join(outDir, 'llms.txt'), llmsTxt);
fs.writeFileSync(path.join(outDir, 'llms-full.txt'), llmsFullTxt);

// eslint-disable-next-line no-console
console.log(`llms.txt and llms-full.txt written to ${outDir}`);
