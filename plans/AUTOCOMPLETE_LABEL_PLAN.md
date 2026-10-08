# Plan: autocomplete shows the raw id on edit

## Symptom

A field configured as

```json
"userId": {
  "fieldInput": {
    "type": "text",
    "options": {
      "format": "autocomplete",
      "resource": "/users/schemas",
      "labelKey": "name",
      "valueKey": "id",
      "storeValue": true
    }
  }
}
```

renders `b4c6f946-b587-...` instead of the user's name when the edit form is opened.
Create works because the user clicks an option and the component sets its own label locally.

## Root cause

1. `@ghentcdh/ui` `AutoComplete` derives its visible text purely from `modelValue`
   (`node_modules/@ghentcdh/ui/index.mjs:1568-1574`): an **object** is labelled via `labelKey`,
   a **primitive** is printed verbatim. There is no id -> label resolution.
2. `storeValue: true` makes `AutocompleteControlRenderer.vue:71-75` store the bare scalar,
   so the form value on edit is the id string.
3. `GET /<resource>/:id` returns only the scalar for this column — `includeInFindOne` is set only
   for `fieldInput.format === "relation"` sub-resources (`adapter/sub-resource.builder.ts:29-32,112-118`),
   and the `{value,label}` envelope is applied on `findAll` only, never on `findOne`
   (`read.repository.ts:286-294`).
4. `displayKey` is never read by the autocomplete path — only by table/view/RelationCell.
   Both `displayKey` entries in the config above are inert.

So nothing, anywhere in the stack, can turn the stored id back into a label.

## Recommended fix — client-side hydration (no backend change, works for every resource)

### 1. `useFetchOption.ts` — add a resolve-by-value path

`packages/crouton-forms-vue/src/forms/renderers/controls/composables/useFetchOption.ts`

- Return `fetchByValue(value)` next to `fetchOptions`, for both `useResourceOptions` and `useRemoteOption`.
- Resource case: use `resource.operations.findOne` (already parsed in `controls/resource.ts:33-52`)
  with `{id}` substituted; fall back to `findAll?filter=<valueKey>:<value>:eq`
  (`read.repository.ts:30-48` supports `field:value:operator`) when `findOne` is absent.
- Normalise the result to `{ [valueKey]: ..., [labelKey]: ... }`.

### 2. Cache

- Memoise `getResourceSchema` (`controls/resource.ts:130-142`) — currently one HTTP GET per call.
- Add a small `Map<"resource|value", Promise<option>>` label cache, mirroring `FormDefCache`
  (`crouton-vue/src/composables/form-def.ts:48-105`), with the same `invalidate` hooks.

### 3. `AutocompleteControlRenderer.vue`

- Add `const displayValue = computedAsync(...)`: when `value` is a non-empty primitive and
  `labelKey !== valueKey`, resolve via `fetchByValue`, else pass `value` through.
- Bind `:model-value="displayValue"` (object) instead of the raw scalar.
- Leave `setValue()` untouched — `storeValue: true` keeps emitting the scalar, so the payload
  contract does not change.
- Guard: null/undefined/empty -> pass through unchanged; failed lookup -> fall back to the raw
  value (never blank the field, never throw).

### 4. Fix the refetch storm while we are in there

`AutocompleteControlRenderer.vue:46-52` deep-watches `formValues`, so every keystroke anywhere in
the form refetches the resource schema. Narrow the watch to `appliedOptions` plus only the
`{form.x}` placeholders actually referenced by the lookup uri.

### 5. Mirror in the relation path

`packages/crouton-vue/src/relation/RelationAutocomplete.vue:2-16` has the identical gap.
While editing it:

- pass real `formValues` to `useFetchOptions` instead of `{}` (line 35-44), so `{form.x}`
  placeholders resolve;
- resolve the `props.valueKey` (default `'value'`) vs `props.options.valueKey` inconsistency
  between `extractValue()` (:46-53) and the template (:9).

### 6. Tests

- Unit: `fetchByValue` for findOne and for the findAll-filter fallback; cache hit/miss; missing
  record; `labelKey === valueKey` short-circuit.
- Component: mount the edit form with `storeValue: true` and a scalar id, assert the input shows
  the label and that changing the selection still emits the scalar.

## Alternatives considered

| Option | Verdict |
|---|---|
| Drop `storeValue: true` — the renderer already stores `{value,label}` (`:77-84`) and it round-trips | Works today, zero code. But changes the persisted payload shape and every consumer of it. Good as an immediate workaround, not as the fix. |
| Model the field as `format: "relation"` with `hiddenInView: false`, or add `"include": ["user"]` to resource.json | Makes findOne return the nested object. Per-resource manual config; does not fix the generic autocomplete. |
| Server-side: emit `{value,label}` in `decorateOne` (`read.repository.ts:286-294`) for lookup-backed columns | Fixes both frontends in one place and costs no extra round-trip. Bigger blast radius (payload shape of every findOne). Worth doing later as an optimisation on top of the client fix, not instead of it. |
| Add an `initialLabel` / display-only prop to `@ghentcdh/ui` `AutoComplete` | Cleanest long-term, but needs a release of the UI package. Client hydration works without it. |

## Suggested order

1. Immediate unblock: drop `storeValue: true` on the affected fields.
2. Steps 1-3 (hydration + cache) — the actual fix.
3. Steps 4-6 (watcher, relation mirror, tests).
4. Optional follow-up: server-side `{value,label}` on findOne, then the client hydration becomes a
   fallback rather than the hot path.
