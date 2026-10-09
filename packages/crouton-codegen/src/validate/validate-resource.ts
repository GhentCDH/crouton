
import { type ZodError } from 'zod';

import { ResourceJsonSchema, fieldInputRegistry, runResourceMigrations } from '@ghentcdh/crouton-core';

import { FIELD_INPUT_DOCS_URL } from './docs-url-map';
import { readFile } from 'node:fs/promises';

export interface ValidationIssue {
  file: string;
  path: string;
  code: string;
  message: string;
  hint?: string;
  docs?: string;
}

const levenshtein = (a: string, b: string): number => {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
};

const knownTypes = [...fieldInputRegistry.keys()];

const didYouMean = (typo: string): string | undefined => {
  const best = knownTypes.reduce<{ type: string; dist: number } | undefined>((acc, t) => {
    const d = levenshtein(typo.toLowerCase(), t.toLowerCase());
    return !acc || d < acc.dist ? { type: t, dist: d } : acc;
  }, undefined);
  return best && best.dist <= 3 ? best.type : undefined;
};

const zodPathToPointer = (path: (string | number | symbol)[]): string =>
  '/' + path.map(String).join('/');

type RawObj = Record<string, unknown>;

const checkFieldInputTypes = (
  filePath: string,
  rawColumns: RawObj,
  issues: ValidationIssue[],
): void => {
  for (const [colId, colRaw] of Object.entries(rawColumns)) {
    const col = colRaw as RawObj;
    for (const variant of ['fieldInput', 'fieldView', 'fieldTable'] as const) {
      const fi = col[variant] as RawObj | undefined;
      if (!fi || typeof fi !== 'object') continue;
      const type = fi['type'] as string | undefined;
      if (!type) continue;
      if (fieldInputRegistry.has(type)) continue;
      const suggestion = didYouMean(type);
      issues.push({
        file: filePath,
        path: `/columns/${colId}/${variant}/type`,
        code: 'UNKNOWN_FIELD_INPUT_TYPE',
        message: `Unknown fieldInput type "${type}"`,
        hint: suggestion ? `Did you mean ${suggestion}?` : undefined,
        docs: suggestion ? FIELD_INPUT_DOCS_URL[suggestion] : undefined,
      });
    }
  }
};

export const validateResourceFile = async (
  filePath: string,
  options: { strict?: boolean } = {},
): Promise<ValidationIssue[]> => {
  const issues: ValidationIssue[] = [];

  let raw: string;
  try {
    raw = await readFile(filePath, 'utf-8');
  } catch (err) {
    return [{ file: filePath, path: '', code: 'FILE_READ_ERROR', message: (err as Error).message }];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return [{ file: filePath, path: '', code: 'JSON_PARSE_ERROR', message: (err as SyntaxError).message }];
  }

  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    try {
      const migrated = runResourceMigrations(parsed as RawObj);
      parsed = migrated.raw;
    } catch (err) {
      issues.push({ file: filePath, path: '/schemaVersion', code: 'MIGRATION_ERROR', message: (err as Error).message });
      return issues;
    }
  }

  const result = ResourceJsonSchema.safeParse(parsed);
  if (!result.success) {
    for (const issue of (result.error as ZodError).issues) {
      issues.push({
        file: filePath,
        path: zodPathToPointer(issue.path),
        code: issue.code.toUpperCase(),
        message: issue.message,
      });
    }
  }

  const rawColumns = (parsed as RawObj)?.['columns'];
  if (rawColumns && typeof rawColumns === 'object' && !Array.isArray(rawColumns)) {
    checkFieldInputTypes(filePath, rawColumns as RawObj, issues);
  }

  // ponytail: strict compile step skipped, add when crouton-api loader is extractable
  void options.strict;

  return issues;
};
