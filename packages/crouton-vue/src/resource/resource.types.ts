import type { ListRequestInput } from '../utils/request';

/**
 * Data payload sent with API requests (query params, body, etc.).
 */
type RequestData = ListRequestInput;

export type { RequestData };

/**
 * Callback invoked when a resource action occurs (e.g. view, create, update, close).
 *
 * @param event - The event name (`'view'`, `'create'`, `'update'`, `'close'`, etc.).
 * @param data  - Contextual payload associated with the event.
 */
export type HandleEvent = (event: string, data: unknown) => void;
