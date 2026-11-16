export type HighlightPart = { text: string; match: boolean };

/**
 * Split `text` into parts, flagging case-insensitive matches of `query`.
 * Returns plain text parts so the caller renders them with text
 * interpolation — option labels come from API data and must never be
 * rendered as HTML.
 */
export const splitHighlight = (text: string, query: string): HighlightPart[] => {
  if (!query) return [{ text, match: false }];
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // With a capture group, split() puts the matches at odd indices.
  return text
    .split(new RegExp(`(${escaped})`, 'gi'))
    .map((part, i) => ({ text: part, match: i % 2 === 1 }))
    .filter((part) => part.text !== '');
};
