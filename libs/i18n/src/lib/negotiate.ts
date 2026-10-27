type LanguageEntry = { tag: string; q: number };

const parseAcceptLanguage = (header: string): LanguageEntry[] => {
  const entries: LanguageEntry[] = [];

  for (const part of header.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const [tag, ...params] = trimmed.split(';');
    let q = 1;
    for (const param of params) {
      const match = param.trim().match(/^q\s*=\s*([0-9.]+)$/);
      if (match) {
        q = parseFloat(match[1]);
        if (isNaN(q)) q = 0;
      }
    }
    entries.push({ tag: tag.trim().toLowerCase(), q });
  }

  return entries.sort((a, b) => b.q - a.q);
};

export const resolveLanguage = (
  acceptLanguage: string | undefined | null,
  supported: readonly string[],
  defaultLanguage: string,
): string => {
  if (!acceptLanguage) return defaultLanguage;

  const supportedLower = supported.map((s) => s.toLowerCase());
  const entries = parseAcceptLanguage(acceptLanguage);

  for (const { tag, q } of entries) {
    if (q <= 0) continue;

    if (tag === '*') return defaultLanguage;

    // exact match
    const exactIdx = supportedLower.indexOf(tag);
    if (exactIdx !== -1) return supported[exactIdx];

    // base tag match: "nl-BE" → "nl"
    const base = tag.split('-')[0];
    const baseIdx = supportedLower.indexOf(base);
    if (baseIdx !== -1) return supported[baseIdx];
  }

  return defaultLanguage;
};
