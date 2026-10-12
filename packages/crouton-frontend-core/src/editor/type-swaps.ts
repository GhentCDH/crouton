export type CanvasTypeOption = { value: string; label: string };

const STRING_FAMILY: CanvasTypeOption[] = [
  { value: 'string', label: 'Text' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'markdown', label: 'Markdown' },
];

const NUMBER_FAMILY: CanvasTypeOption[] = [
  { value: 'number', label: 'Number' },
  { value: 'Integer', label: 'Integer' },
];

/** Normalizes the handful of values that all mean "plain text" to one canonical key. */
export const normalizeCanvasType = (type: string | undefined): string => {
  if (type === undefined || type === 'text') return 'string';
  return type;
};

/**
 * Same-shape swap options for a column currently using `type` — always
 * includes `type` itself (already normalized) so the current value has a
 * matching entry in the menu. Returns an empty array when there's no safe
 * swap partner (boolean, select/mutliSelect, date family, anything else).
 */
export const swapOptionsFor = (
  type: string | undefined,
): CanvasTypeOption[] => {
  const normalized = normalizeCanvasType(type);
  if (STRING_FAMILY.some((o) => o.value === normalized)) return STRING_FAMILY;
  if (NUMBER_FAMILY.some((o) => o.value === normalized)) return NUMBER_FAMILY;
  return [];
};

/** Types the canvas knows how to render at all (beyond just offering a swap for). */
export const CANVAS_SUPPORTED_TYPES = new Set<string>([
  'string',
  'textarea',
  'markdown',
  'number',
  'Integer',
  'boolean',
  'select',
  'mutliSelect',
  'toggle',
]);

export const isCanvasSupportedType = (type: string | undefined): boolean =>
  CANVAS_SUPPORTED_TYPES.has(normalizeCanvasType(type));
