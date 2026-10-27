import { isRecord } from './guards';

export const errorMessage = (e: unknown): string => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return String(e);
};

export const isPrismaKnownError = (e: unknown): e is { code: string; message: string } =>
  isRecord(e) && typeof (e as Record<string, unknown>).code === 'string';
