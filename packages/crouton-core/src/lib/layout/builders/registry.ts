import type { LayoutBuildContext, ViewConfig } from './layout-builder.types';
import type { Layout } from '../../resource/layout/Layout.schema';

/**
 * A builder for a custom layout kind.
 * Receives the kind-specific layout node (layout[kind]) and the shared context.
 * Returns a map of view-name → ViewConfig (empty when the kind produces nothing).
 */
export type KindBuilderFn = (
  node: unknown,
  ctx: LayoutBuildContext,
) => Record<string, ViewConfig>;

const _registry = new Map<string, KindBuilderFn>();

/**
 * Register a builder for a custom layout kind.
 * The kind name must not shadow built-ins (form, view, table, filter).
 * Registration order determines output key order for custom kinds.
 */
export const registerLayoutBuilder = (kind: string, fn: KindBuilderFn): void => {
  _registry.set(kind, fn);
};

export const unregisterLayoutBuilder = (kind: string): void => {
  _registry.delete(kind);
};

/**
 * Invoke all registered custom builders and merge their outputs.
 * Each builder receives `layout[kind]` (undefined when absent) and the context.
 */
export const buildCustomLayouts = (
  layout: Layout | undefined,
  ctx: LayoutBuildContext,
): Record<string, ViewConfig> => {
  if (_registry.size === 0) return {};
  const result: Record<string, ViewConfig> = {};
  for (const [kind, fn] of _registry) {
    const node = (layout as Record<string, unknown> | undefined)?.[kind];
    Object.assign(result, fn(node, ctx));
  }
  return result;
};
