import type { useResources } from './useResources';

/**
 * Data payload sent with API requests (query params, body, etc.).
 */
type RequestData = any;

export type { RequestData };

/**
 * Reactive object returned by {@link useResources} that exposes
 * the current loading state and fetched data for a resource.
 *
 * Derived from the actual return shape of `useResources` so it
 * stays in sync automatically.
 */
export type ResourceApi = NonNullable<ReturnType<typeof useResources>>;

/**
 * Callback invoked when a resource action occurs (e.g. view, create, update, close).
 *
 * @param event - The event name (`'view'`, `'create'`, `'update'`, `'close'`, etc.).
 * @param data  - Contextual payload associated with the event.
 */
export type HandleEvent = (event: string, data: any) => void;
