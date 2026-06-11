// ── Route segments ────────────────────────────────────────────────────────

/** Static route segments registered before any :id route. */
export const ROUTE_DEFINITION = 'definition';
export const ROUTE_SCHEMAS = 'schemas';
export const ROUTE_RESOURCE_JSON = 'resource.json';
export const ROUTE_PROCEDURE = 'procedure';

// ── HTTP methods ──────────────────────────────────────────────────────────

export const HTTP_GET = 'get';
export const HTTP_POST = 'post';
export const HTTP_PATCH = 'patch';
export const HTTP_DELETE = 'delete';

// ── Field formats ─────────────────────────────────────────────────────────

export const FORMAT_RELATION = 'relation';

// ── Prisma ────────────────────────────────────────────────────────────────

/** Prisma error code for "record not found". */
export const PRISMA_NOT_FOUND_CODE = 'P2025';

// ── UI defaults ───────────────────────────────────────────────────────────

export const DEFAULT_COLSPAN = 12;
export const DEFAULT_ID_TYPE = 'string';
export const DEFAULT_ID_FIELD = 'id';
