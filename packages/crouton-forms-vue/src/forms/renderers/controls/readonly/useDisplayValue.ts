export const useDisplayValue = (value: any, formValues: any, opts: any) => {
  const raw = value;

  if (typeof raw !== 'object') {
    return raw ?? null;
  }

  if (opts.dataPath) {
    // Traverse the dotted dataPath in formValues (e.g. "bibliography" → formValues.bibliography)
    const nested = opts.dataPath
      .split('.')
      .reduce((o: any, k: string) => o?.[k], formValues);
    if (opts.key && nested && typeof nested === 'object')
      return (nested as any)[opts.key] ?? null;
    return nested ?? null;
  }
  if (raw !== null && typeof raw === 'object' && opts.key) {
    return (raw as any)[opts.key] ?? null;
  }
  return raw ?? null;
};
