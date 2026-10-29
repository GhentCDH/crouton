import type { CalculatedColumn, JsonColumn } from '../resource';

/**
 * Map a resource's computed columns (`column.computed`) to the compiled
 * `CalculatedColumn` shape consumed by calculated-column injection.
 *
 * Visibility is not carried: it is resolved from the layout (or the column flags)
 * by `resolveCalculatedPlacement` at injection time.
 */
export const toCalculatedColumns = (
  columns: JsonColumn[] | undefined,
): CalculatedColumn[] =>
  (columns ?? [])
    .filter((c) => c.computed)
    .map((c): CalculatedColumn => ({
      id: c.id,
      alias: c.id,
      label: c.label ?? c.id,
      sqlExpression: c.computed!.sql,
      type: c.computed!.type ?? 'string',
      ...(c.fieldInput && { fieldInput: c.fieldInput }),
    }));
