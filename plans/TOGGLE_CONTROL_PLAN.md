Status: planned
# Toggle Control Plan

## Goal

Add a **`toggle`** control type: a single-select control rendered as a row of
buttons where exactly one option is shown as active. It is behaviourally
identical to `select` (scalar value, same options shape) but presents the
choices inline as buttons instead of a dropdown — ideal for small, fixed option
sets (2–5 items) such as status, direction, or size.

It mirrors `select` in every way that matters:

- same data shape (a single scalar value, or a stored object key)
- same option sources (`options` / `values`, `labelKey` / `valueKey`,
  `storeValue`, `clearable`)
- same binding composable (`useSelectBinding`)
- same readonly rendering (the generic `ControlReadonlyRenderer` already shows
  the selected label)

The only difference is the presentation layer: a `Btn` group where the active
option is solid and the rest are outlined.

## Author API

```ts
ControlBuilder.properties<T>('status').toggle({
  values: [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Archived', value: 'archived' },
  ],
});
```

Resource-config equivalent (drives `control.control(type, options)` in
`crouton-api`, which becomes `options.format`):

```jsonc
{ "type": "toggle", "options": { "values": [ ... ] } }
```

Options (all optional except the option list):

| option      | meaning                                                        | default   |
| ----------- | -------------------------------------------------------------- | --------- |
| `options` / `values` | the option list (`{ label, value }[]`)                | required  |
| `labelKey`  | key read for the button label when options are objects         | `label`   |
| `valueKey`  | key read for the stored value when options are objects         | `value`   |
| `storeValue`| store `option[valueKey]` instead of the whole option object    | `false`   |
| `clearable` | clicking the active button clears the value                    | `true`    |
| `color`     | `Btn` color for the active button (`primary`/`secondary`/…)    | `primary` |
| `size`      | `Btn` size (`xs`/`sm`/`lg`/`xl`)                                | `sm`      |

## Files to change

### 1. `packages/crouton-core/src/lib/layout/control.builder.ts`

- Add `toggle: 'toggle'` to the `ControlType` map.
- Add a `ToggleOptions` interface (`format: 'toggle'`, the select option keys,
  plus optional `color` / `size` / `clearable`).
- Add a `toggle(options)` builder method mirroring `select()`.

### 2. `packages/crouton-forms-vue/src/testers/tester.ts`

- Add `isToggleControl = and(uiTypeIs('Control'), optionIsIgnoreCase('format', ControlType.toggle))`.

### 3. `packages/crouton-forms-vue/src/forms/renderers/controls/ToggleControlRenderer.vue` (new)

- Bind with `useSelectBinding` (identical option resolution to `select`).
- Render a `ControlWrapper` (label / error / description chrome, same as the
  select control) containing a flex row of `Btn`s.
- Active option → solid; others → `outline`. Disabled when the form/field is
  readonly (`wrapper.enabled === false`).
- On click, store the value the same way `SelectControlRenderer` does
  (`storeValue` → `option[valueKey]`, else the whole option). If `clearable`
  and the active button is clicked again, clear to `undefined`.

### 4. `packages/crouton-forms-vue/src/forms/renderers/controls/index.ts`

- Import `ToggleControlRenderer` and register it:
  `{ tester: rankWith(11, isToggleControl), renderer: ToggleControlRenderer }`
  (same rank as `select`).

### 5. Editor canvas (mirror `select` so the visual editor knows the type)

- `packages/crouton-editor-vue/src/canvas/FieldPreview.vue` — add a `toggle`
  branch that previews the button group (disabled).
- `packages/crouton-editor-vue/src/canvas/type-swaps.ts` — add `'toggle'` to
  `CANVAS_SUPPORTED_TYPES`. (Left out of the same-shape swap families for now,
  exactly like `select`/`boolean`, since swapping in/out changes presentation
  semantics that deserve their own flow.)

### 6. `packages/crouton-forms-vue/src/testers/__tests__/tester.spec.ts`

- Add an `isToggleControl` describe block covering: `format: 'toggle'`,
  case-insensitivity, non-toggle format, and non-Control element.

## Non-goals

- No multi-select variant (that stays `mutliSelect`).
- No remote/URI-fed options in v1 (matches `select`'s common case; the same
  `useFetchOptions` path could be added later if needed).
- No new readonly renderer — the generic one already resolves the label.
