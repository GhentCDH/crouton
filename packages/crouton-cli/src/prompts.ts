import * as clack from '@clack/prompts';

/** Thrown when the user cancels a prompt (Ctrl+C); command runners catch it and exit quietly. */
export class CancelledError extends Error {
  constructor() {
    super('Cancelled');
    this.name = 'CancelledError';
  }
}

/** Unwrap a clack prompt result, throwing `CancelledError` when the user cancelled. */
export const assertNotCancel = <T>(value: T | symbol): T => {
  if (clack.isCancel(value)) throw new CancelledError();
  return value as T;
};
