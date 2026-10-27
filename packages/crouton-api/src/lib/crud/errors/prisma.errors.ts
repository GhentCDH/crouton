import { isRecord } from '@ghentcdh/crouton-core';

export const isPrismaKnownError = (
  e: unknown,
): e is { code: string; message: string } =>
  isRecord(e) && typeof (e as Record<string, unknown>).code === 'string';
