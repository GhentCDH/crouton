/**
 * Edit restrictions derived from enum-restricted columns.
 *
 * A column combining a shared `enum` with a local `fieldInput.options.values`
 * restriction means: values outside the list do not belong to this screen.
 * The compile step projects such columns into `layout.table.options.editRequires`
 * (see `buildEditRequires` in crouton-core) and the table's built-in edit action
 * is hidden for rows carrying a value outside every restricted list.
 */
export type EditRequire = {
  field: string;
  values: unknown[];
};

const unwrapValue = (v: unknown): unknown =>
  v && typeof v === 'object' && 'value' in (v as object)
    ? (v as { value: unknown }).value
    : v;

/**
 * True when the row's stored value for `field` is inside `values`. Handles the
 * `{ value, label }` envelope the API wraps around list rows, plain scalars,
 * and multi-select arrays (every element must be allowed).
 */
export const rowValueInList = (
  row: Record<string, unknown>,
  { field, values }: EditRequire,
): boolean => {
  const raw = row[field];
  const allowed = values.map(unwrapValue);
  const v = Array.isArray(raw) ? raw.map(unwrapValue) : unwrapValue(raw);
  return Array.isArray(v)
    ? v.every((el) => allowed.includes(el))
    : allowed.includes(v);
};

/** The built-in Edit action stays visible only when every requirement holds. */
export const editVisibleFor = (
  row: Record<string, unknown>,
  editRequires: EditRequire[] | undefined,
): boolean => !editRequires?.length || editRequires.every((req) => rowValueInList(row, req));
