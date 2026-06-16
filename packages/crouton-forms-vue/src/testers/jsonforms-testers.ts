import type { JsonSchema, UISchemaElement } from '@jsonforms/core';

/**
 * Local re-implementation of the handful of JSON Forms tester combinators this
 * library uses at runtime. JSON Forms is otherwise only needed for its types,
 * so this lets `@jsonforms/core` stay a type-only (dev) dependency.
 *
 * Note: in this library `findRenderer` always invokes testers with the schema
 * already resolved for the control's scope (see `Dispatch.vue`). `schemaTypeIs`
 * therefore compares against the resolved sub-schema directly and does not need
 * to walk `uischema.scope` against a root schema.
 */

export type Tester = (
  uischema: UISchemaElement,
  schema: JsonSchema,
  context?: unknown,
) => boolean;

export type RankedTester = (
  uischema: UISchemaElement,
  schema: JsonSchema,
  context?: unknown,
) => number;

/** Returned by a ranked tester when it does not apply. */
export const NOT_APPLICABLE = -1;

/** Wrap a boolean tester so it returns `rank` when it matches, `-1` otherwise. */
export const rankWith =
  (rank: number, tester: Tester): RankedTester =>
  (uischema, schema, context) =>
    tester(uischema, schema, context) ? rank : NOT_APPLICABLE;

/** Matches only when every supplied tester matches. */
export const and =
  (...testers: Tester[]): Tester =>
  (uischema, schema, context) =>
    testers.every((tester) => tester(uischema, schema, context));

/** Matches when at least one supplied tester matches. */
export const or =
  (...testers: Tester[]): Tester =>
  (uischema, schema, context) =>
    testers.some((tester) => tester(uischema, schema, context));

/** Matches when the UI schema element has the given `type`. */
export const uiTypeIs =
  (expected: string): Tester =>
  (uischema) =>
    !!uischema && (uischema as { type?: string }).type === expected;

const isControl = (uischema: UISchemaElement): boolean =>
  !!uischema && (uischema as { type?: string }).type === 'Control';

/**
 * Matches a control whose (already resolved) schema has the given `type`.
 */
export const schemaTypeIs =
  (expected: string): Tester =>
  (uischema, schema) =>
    isControl(uischema) &&
    !!schema &&
    (schema as { type?: string }).type === expected;
