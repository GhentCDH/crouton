import { type InjectionKey, inject, provide } from 'vue';

/** Scope values for a composite uniqueness check: `{ scopeFieldId: value }`. */
export type UniqueScope = Record<string, unknown>;

/**
 * Resource-aware uniqueness check. Resolves `true` when `value` is still
 * available for `field` (within `scope`, when composite), `false` when it is
 * already taken. Implementations close over the resource endpoint and (in edit
 * mode) the record's own id.
 */
export type UniqueCheckFn = (
  field: string,
  value: string,
  scope?: UniqueScope,
) => Promise<boolean>;

const UNIQUE_CHECK_KEY: InjectionKey<UniqueCheckFn | null> = Symbol(
  'crouton:unique-check',
);

/** Provide the uniqueness check to all descendant form controls. */
export const provideUniqueCheck = (fn: UniqueCheckFn | null): void => {
  provide(UNIQUE_CHECK_KEY, fn);
};

/** Inject the uniqueness check, or `null` when the host didn't provide one. */
export const useUniqueCheckFn = (): UniqueCheckFn | null =>
  inject(UNIQUE_CHECK_KEY, null);

/** A top-level column that should be checked for uniqueness. */
export interface UniqueField {
  field: string;
  message?: string;
  /** Other field ids this field is unique *within* (composite uniqueness). */
  scope?: string[];
}

const DEFAULT_DEBOUNCE = 400;
const DEFAULT_MESSAGE = 'This value is already taken';

interface FieldState {
  timer?: ReturnType<typeof setTimeout>;
  token: number;
  lastKey?: string;
  lastResult: boolean;
}

/**
 * Build a per-field, debounced, race-guarded uniqueness checker. Repeated calls
 * for the same value+scope reuse the cached result; a newer value supersedes an
 * in-flight debounce; and any thrown error resolves `true` (fail-open — the
 * server still enforces uniqueness on write).
 */
export const createUniqueChecker = (
  checkFn: UniqueCheckFn,
  debounceMs: number = DEFAULT_DEBOUNCE,
) => {
  const states = new Map<string, FieldState>();
  const stateFor = (field: string): FieldState => {
    let s = states.get(field);
    if (!s) {
      s = { token: 0, lastResult: true };
      states.set(field, s);
    }
    return s;
  };

  return (field: string, value: string, scope?: UniqueScope): Promise<boolean> => {
    const s = stateFor(field);
    const key = `${value}\u0000${scope ? JSON.stringify(scope) : ''}`;
    if (s.lastKey === key) return Promise.resolve(s.lastResult);

    const myToken = ++s.token;
    return new Promise<boolean>((resolve) => {
      if (s.timer) clearTimeout(s.timer);
      s.timer = setTimeout(async () => {
        if (myToken !== s.token) {
          resolve(s.lastResult);
          return;
        }
        try {
          const ok = await checkFn(field, value, scope);
          if (myToken === s.token) {
            s.lastKey = key;
            s.lastResult = ok;
            resolve(ok);
          } else {
            resolve(s.lastResult);
          }
        } catch (e) {
          console.warn('[crouton] unique check failed', e);
          resolve(true);
        }
      }, debounceMs);
    });
  };
};

/**
 * Layer async uniqueness validation onto a form's zod `validationSchema`.
 *
 * Returns the schema unchanged when there is nothing to check (no unique
 * fields, or no check fn). Otherwise appends an async `superRefine` that, for
 * each unique field, skips empty and unchanged-from-initial values, gathers any
 * composite `scope` values from the current form data, runs the debounced
 * check, and raises a field-scoped issue when the value is taken.
 */
export const withUniqueChecks = <S>(
  schema: S,
  fields: UniqueField[],
  checkFn: UniqueCheckFn | null,
  initialValues?: Record<string, unknown>,
): S => {
  if (!checkFn || fields.length === 0) return schema;
  const check = createUniqueChecker(checkFn);

  return (schema as any).superRefine(async (data: any, ctx: any) => {
    await Promise.all(
      fields.map(async ({ field, message, scope }) => {
        const value = data?.[field];
        if (value === undefined || value === null || value === '') return;
        if (initialValues && value === initialValues[field]) return;

        let scopeValues: UniqueScope | undefined;
        if (scope?.length) {
          scopeValues = {};
          for (const scopeId of scope) scopeValues[scopeId] = data?.[scopeId];
        }

        const ok = await check(field, String(value), scopeValues);
        if (!ok) {
          ctx.addIssue({
            code: 'custom',
            path: [field],
            message: message ?? DEFAULT_MESSAGE,
          });
        }
      }),
    );
  }) as S;
};

/** Collect top-level controls declared `unique` from a form ui schema. */
export const collectUniqueFields = (uiSchema: unknown): UniqueField[] => {
  const out: UniqueField[] = [];
  const visit = (node: any): void => {
    if (!node || typeof node !== 'object') return;
    const scope: string | undefined = node.scope;
    const unique = node.options?.unique;
    // Only top-level columns (`#/properties/<field>`) map to a DB unique column.
    const match =
      typeof scope === 'string' && /^#\/properties\/[^/]+$/.test(scope);
    if (match && unique?.enabled) {
      out.push({
        field: scope!.replace('#/properties/', ''),
        message: unique.message,
        scope: unique.scope,
      });
    }
    for (const child of node.elements ?? []) visit(child);
  };
  visit(uiSchema);
  return out;
};
