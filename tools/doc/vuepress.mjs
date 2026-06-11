import fs from 'fs';
import path from 'path';

const docsPath = 'docs/';

const EXCLUDE_ALWAYS = ['node_modules', 'dist', '.vuepress'];

function writeSidebarFile(dir, sidebar) {
  fs.writeFileSync(
    path.join(dir, 'typedoc_sidebar.json'),
    JSON.stringify(sidebar),
  );
}

function formatText(text) {
  return text.charAt(0).toUpperCase() + text.replaceAll('-', ' ').slice(1);
}

// fsDir   = path on disk relative to docsPath (e.g. 'crouton-api')
// linkDir = URL path used in sidebar links   (e.g. 'crouton-api')
function generateDirectoryObject(fsDir, linkDir, exclude) {
  const dirPath = path.join(docsPath, fsDir);
  const items = [];

  const files = fs.readdirSync(dirPath);
  let indexFile = '';

  files.forEach((file) => {
    if ([...EXCLUDE_ALWAYS, ...exclude].indexOf(file) !== -1) return;

    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isFile()) {
      if (!file.endsWith('.md')) return;
      if (file === 'index.md') {
        indexFile = 'index.md';
        return;
      }
      if (file === 'README.md') {
        indexFile = 'README.md';
        return;
      }

      const fileName = file.substring(0, file.lastIndexOf('.'));
      items.push(`/${linkDir}/${fileName}`);
    }

    if (stat.isDirectory()) {
      items.push(
        generateDirectoryObject(
          path.join(fsDir, file),
          path.join(linkDir, file),
          exclude,
        ),
      );
    }
  });

  const dirName = path.basename(dirPath);
  return {
    text: formatText(dirName),
    children: items,
    items: items,
    collapsed: true,
    link: indexFile ? `/${linkDir}/${indexFile}` : '',
  };
}

// fsDir   = filesystem path relative to docsPath (e.g. 'crouton-api')
// linkDir = URL base for sidebar links — defaults to last segment of fsDir
function createMenu(fsDir, linkDir = path.basename(fsDir), exclude = []) {
  const dirPath = path.join(docsPath, fsDir);
  const items = generateDirectoryObject(fsDir, linkDir, exclude);
  writeSidebarFile(dirPath, items.items);
}

const searchMdFiles = (dir, depth, currentDepth) => {
  let mdFiles = [];
  const files = fs.readdirSync(dir);

  if (depth <= currentDepth) return mdFiles;

  files.forEach((file) => {
    if (EXCLUDE_ALWAYS.indexOf(file) !== -1) return;
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      mdFiles = mdFiles.concat(
        searchMdFiles(filePath, depth, currentDepth + 1),
      );
    } else if (file.endsWith('.md')) {
      mdFiles.push(filePath);
    }
  });
  return mdFiles;
};

const copyMd = (
  from,
  to,
  { depth = Number.MAX_SAFE_INTEGER, readmeOnly = false } = {},
) => {
  const fromDir = from || '.';
  if (!fs.existsSync(fromDir)) {
    // eslint-disable-next-line no-console
    console.warn(`Skipping ${fromDir} (does not exist)`);
    return;
  }
  const searchFiles = searchMdFiles(fromDir, depth, 0);
  const toDir = path.join(docsPath, to);

  searchFiles.forEach((file) => {
    if (readmeOnly && !file.endsWith('README.md')) return;
    const relPath = path.relative(fromDir, file);
    const toFile = path.join(toDir, relPath);
    const dir = path.dirname(toFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    // eslint-disable-next-line no-console
    console.log(`Copying ${file} to ${toFile}`);
    fs.copyFileSync(file, toFile);
  });
};

// ── package docs → docs site ─────────────────────────────────────────────────
// Each package keeps its documentation in packages/<name>/docs (README.md +
// any extra .md files / subfolders). They are copied into the docs site and a
// sidebar (typedoc_sidebar.json) is generated per package.
copyMd('packages/crouton-api/docs', 'crouton-api');
copyMd('packages/crouton-core/docs', 'crouton-core');
copyMd('packages/crouton-vue/docs', 'crouton-vue');

createMenu('crouton-api');
createMenu('crouton-core');
createMenu('crouton-vue');

// ── root README → docs home ──────────────────────────────────────────────────
copyMd('', '', { depth: 1, readmeOnly: true });

// ── root assets (referenced by the README) → docs/assets ─────────────────────
if (fs.existsSync('assets')) {
  fs.cpSync('assets', path.join(docsPath, 'assets'), { recursive: true });
}
