# Common mistakes

## 1. Hand-editing auto-generated columns

`crouton update` owns the `columns` block derived from Prisma. Edits to auto-generated fields (column names, types) are overwritten on the next `crouton update`.

**Fix**: only edit `fieldInput`, `label`, `hidden`, `readonly` inside each column entry. Never add or remove column keys that map to Prisma fields.

## 2. Using `kind: "custom"` when you need `adapter: "custom"`

`kind: "custom"` in `resource.json` means "this resource has a custom repository". It does not change how the datasource connects to data.

If your data source is external (not Prisma), set `adapter: "custom"` in `datasource.json` instead.

## 3. Typos in fieldInput type (`autocompleet`, `Autocomplete`, etc.)

The `type` value is case-sensitive and must exactly match a registered input type (e.g. `autocomplete`, not `Autocomplete` or `autocompleet`).

**Fix**: run `crouton validate` — it reports unknown fieldInput types.

## 4. Missing `crouton validate` after edits

Schema violations, unknown resources in relations, and broken references are only caught by the validator, not at runtime.

**Fix**: always run `crouton validate` after any change to `resource.json` or `crouton.json` before building or committing.

## 5. Wrong relation direction

`manyToOne` means the FK is on **this** resource. `oneToMany` means the FK is on the **target** resource. Swapping them causes the relation panel to query the wrong table.

**Fix**: check which table holds the FK column. That resource gets `manyToOne`; the other gets `oneToMany`.
