export const readEnv = (name: string): string | undefined => {
  const proc = (globalThis as Record<string, unknown>)['process'] as
    | { env?: Record<string, string | undefined> }
    | undefined;
  return proc?.env?.[name];
};
