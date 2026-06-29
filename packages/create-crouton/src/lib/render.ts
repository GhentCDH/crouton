/**
 * Minimal template renderer.
 * Tokens: {{key}} → replacement string.
 * Conditionals: {{#if nx}}...{{/if}} blocks stripped when condition is false.
 * Comment-strips: {{!-- ... --}} removed entirely.
 */

export interface Tokens {
  name: string;         // slug, e.g. "my-app"
  Name: string;         // PascalCase, e.g. "MyApp"
  pmRun: string;        // e.g. "pnpm" or "npm run"
  pm: string;           // e.g. "pnpm"
  year: string;
  backendPort: string;
  frontendPort: string;
  dbName: string;
  urlEnv: string;
  backendAppName: string;  // Nx: app dir name, e.g. "backend"
  frontendAppName: string; // Nx: app dir name, e.g. "frontend"
  generatedPackage: string; // e.g. "@my-app/generated-types" or "generated/types"
  version: string;          // crouton package version range, e.g. "^0.0.1-alpha"
}

type Condition = 'nx' | 'frontend' | 'sample';

export const render = (template: string, tokens: Tokens, flags: Record<Condition, boolean> = { nx: false, frontend: true, sample: false }): string => {
  let out = template;

  // Strip comment blocks
  out = out.replace(/\{\{!--[\s\S]*?--\}\}/g, '');

  // Process conditionals
  for (const [cond, active] of Object.entries(flags) as [Condition, boolean][]) {
    const re = new RegExp(`\\{\\{#if ${cond}\\}\\}([\\s\\S]*?)\\{\\{/if\\}\\}`, 'g');
    out = out.replace(re, active ? '$1' : '');
  }

  // Replace tokens
  for (const [key, value] of Object.entries(tokens)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }

  return out.trim() + '\n';
};

/** e.g. "my-app" → "MyApp" */
export const toPascalCase = (slug: string): string =>
  slug.replace(/[-_](.)/g, (_, c: string) => c.toUpperCase()).replace(/^(.)/, (_, c: string) => c.toUpperCase());

/** npm-safe slug validation */
export const isValidSlug = (name: string): boolean => /^[a-z0-9][a-z0-9._-]*$/.test(name);

/** Package manager run prefix */
export const pmRunPrefix = (pm: string): string => (pm === 'npm' ? 'npm run' : pm);
