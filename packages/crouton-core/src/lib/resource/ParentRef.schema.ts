import { z } from 'zod';

/**
 * Declares that a resource is only addressable underneath a parent.
 *
 * Set on the **child**, which then mounts its own controller at
 * `<parent.route>/:<parent.param>/<route>` and serves every operation from
 * there. Nothing is configured on the parent, and the parent does not need to
 * exist as a crouton resource at all.
 *
 * ```jsonc
 * { "kind": "custom", "name": "expense", "route": "expense",
 *   "parent": { "route": "group", "param": "groupId" } }
 * // → GET  group/:groupId/expense
 * // → GET  group/:groupId/expense/:id
 * // → POST group/:groupId/expense   …
 * ```
 *
 * Nesting is *exclusive*: no top-level route is registered, so the parent id is
 * always present and a query can never accidentally run unscoped.
 *
 * Only valid on a `kind: "custom"` resource. Prisma-backed nesting is derived
 * from relation columns on the parent instead — see `buildSubResources`.
 */
export const ParentRefSchema = z.object({
  /** Route segment of the parent, e.g. `"group"`. */
  route: z.string(),
  /**
   * Name of the path parameter carrying the parent id, e.g. `"groupId"`.
   * Avoid `"id"` — that is the child's own id in `/:id` routes.
   */
  param: z.string().default('parentId'),
  /** Type of the parent id, used to coerce the path param. Defaults to `'string'`. */
  idType: z.enum(['string', 'number']).optional(),
});

export type ParentRef = z.infer<typeof ParentRefSchema>;

/** Controller path for a resource, nested under its parent when it has one. */
export const resourceControllerPath = (
  route: string,
  parent: ParentRef | undefined,
): string => (parent ? `${parent.route}/:${parent.param}/${route}` : route);
