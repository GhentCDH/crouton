import type { Command } from 'commander';

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const registerMigrateCommand = (program: Command) => {
  program
    .command('migrate')
    .description(
      'Print the migration guide — use migrate-to-next-alpha.md with an AI assistant to migrate resource.json files.',
    )
    .action(async () => {
      // In dev (linked) the file is at repo root, 4 levels up from dist/commands/
      // In published package the file isn't bundled, so we fall back to the GitHub URL.
      const candidates = [
        resolve(__dirname, '..', '..', '..', '..', 'migrate-to-next-alpha.md'),
        resolve(__dirname, '..', '..', '..', 'migrate-to-next-alpha.md'),
        resolve(__dirname, '..', '..', 'migrate-to-next-alpha.md'),
      ];

      for (const guidePath of candidates) {
        try {
          const content = await readFile(guidePath, 'utf-8');
          // eslint-disable-next-line no-console
          console.log('=== Crouton Migration Guide ===\n');
          // eslint-disable-next-line no-console
          console.log(content);
          return;
        } catch {
          /* try next */
        }
      }

      console.error(
        'migrate-to-next-alpha.md not found locally.\n' +
          'Download it from:\n' +
          '  https://raw.githubusercontent.com/GhentCDH/crouton/main/migrate-to-next-alpha.md',
      );
      process.exitCode = 1;
    });
};
