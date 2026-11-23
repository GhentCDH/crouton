# Resource editor — Phase 1: Control Builder

Brand-new editor for `resource.json`, built from scratch (no code shared with `crouton-editor-vue`).
Phase 1 = a **dumb, standalone control builder**: one column in → one column (+ translations) out.

```jsonc
// v-model
"name": {
  "fieldInput": { "type": "string", "options": { "width": "sm" } },
  "required": false,
  "label": "Volledige naam"
}
```

## Decisions

| Topic | Decision |
|---|---|
| Package | New **private** package (e.g. `libs/builder-vue`, `"private": true`), not published |
| Types | Only built-in `fieldInputRegistry` types. Custom types → follow-up |
| Column fields | **All** of `JsonColumnSchema` |
| Translations | Stay in **i18n files** (`TranslationBundleSchema`, `libs/i18n`) so labels are reusable. Builder sets `labelKey` and emits a separate translations patch |
| Options form | ✅ Confirmed: own descriptor walker, rendered with **crouton-ui-vue** widgets (no crouton-forms-vue / JSON Forms for the builder UI; forms-vue only used in LivePreview) |
| Chat | Rule-based parser **+ Chrome built-in AI** (Prompt API) in phase 1 |
| Docs | Demo page + llms docs + keyword drift guard in phase 1 |

## Principles

1. **Schema-driven, zero hand-written option UIs.** Options come from
   `fieldInputRegistry.get(type).options` (Zod) + `opt()` meta. Column fields come from
   `JsonColumnSchema` the same way.
2. **Dumb component.** No fetching, no file I/O. Props in, events out.
3. **One core, many front-ends.** Form UI, rule parser and built-in AI all produce `ColumnPatch[]`
   applied by one pure reducer.
4. **Always valid.** Every result validated with `JsonColumnSchema` + the type's options schema.

## Component API

```ts
// ControlBuilder.properties.ts
export const ControlBuilderProperties = {
  columnId:     { type: String, required: true as const },
  modelValue:   { type: Object as PropType<JsonColumn>, required: true as const },
  resourceName: { type: String, required: true as const },         // for columnKey()
  languages:    { type: Array as PropType<string[]>, default: () => ['en'] },
  translations: { type: Object as PropType<Record<string, TranslationBundle>>, default: () => ({}) },
  aiEnabled:    { type: Boolean, default: true },
};
// emits: update:modelValue (JsonColumn), update:translations (Record<lang, TranslationBundle>)
```

### Translations flow

- Default key = `columnKey(resourceName, columnId)` from `libs/i18n/translation-keys.ts`.
- "Reuse label" = pick an existing key from the passed bundles (autocomplete over all keys)
  → writes `labelKey`; nothing duplicated.
- Editing a translation emits a bundle patch, never writes into the column.
- `label` on the column stays as the fallback only.

## Architecture

```
crouton-core/src/lib/editor/control/        (browser-safe, pure, unit-tested)
  describe.ts      Zod schema → OptionDescriptor tree (options + column fields)
  patch.ts         ColumnPatch / TranslationPatch + applyPatch reducer
  validate.ts      → issues[] (path, message)
  type-switch.ts   change fieldInput.type: keep compatible options, report dropped ones
  vocabulary.ts    descriptors + opt() keywords → parser vocabulary (en/nl)
  intent/
    provider.ts    IntentProvider interface
    rules.ts       rule-based provider (always available)
    built-in-ai.ts Chrome Prompt API provider (progressive)

libs/builder-vue/                            (private, UI only)
  ControlBuilder.vue
  parts/TypePicker.vue  ColumnFields.vue  OptionsForm.vue  VariantPicker.vue
  parts/TranslationsPanel.vue  LivePreview.vue  JsonPane.vue
  chat/CommandBar.vue   (input + proposed diff, apply / discard, provider badge)
```

Core pieces (`describe`, `vocabulary`, `intent`) may move to `crouton-frontend-core` once that exists.

### OptionDescriptor → widget (crouton-ui-vue)

| Schema kind | Descriptor | crouton-ui-vue widget |
|---|---|---|
| string | `string` | `Input` (examples as placeholder) |
| number | `number` | `InputNumber` |
| boolean | `boolean` | `Checkbox` (tri-state: unset / true / false) |
| enum / literal union | `enum` | `SelectComponent` |
| array of primitives | `list` | `MultiSelect` with free text |
| array of objects | `objectList` | repeatable sub-form in `Collapse` |
| object | `group` | `Collapse` fieldset |
| union of objects | `variant` | `VariantPicker` + sub-form |
| record / unknown / When | `json` | `Textarea` JSON fallback |

Descriptors carry `path`, `description`, `examples`, `default`, `deprecated`, `keywords`,
`source: 'column' | 'base' | '<type>'` → groups "Column", "Common", "<Type>". Unknown keys shown as
"Extra options" so nothing is lost on round-trip.

## Chat

### Providers

```ts
type IntentProvider = {
  id: 'rules' | 'built-in-ai';
  isAvailable: () => Promise<'available' | 'downloadable' | 'unavailable'>;
  parse: (input: string, ctx: IntentContext) =>
    Promise<{ patches: Patch[]; unparsed: string[] }>;
};
```

**Rules (always on, ~10–30 kB):** synonym tables for types, URL → `uri` (remote variant),
`*.resource.json` → `resource`, ISO 639-1 codes → translation languages, size words → `width`,
booleans (`required/verplicht`, …), generic `set <option> to <value>` fuzzy-matched on key +
description. EN + NL from day one.

**Built-in AI (Chrome Prompt API, Gemini Nano):**
- On the web since Chrome 148; on-device, no external call. Model is downloaded by Chrome
  once per origin (needs ~22 GB free disk, GPU >4 GB VRAM or 16 GB RAM CPU).
- Feature-detect `'LanguageModel' in self` + `LanguageModel.availability()`; show a
  "download model" button when `downloadable` (requires a user gesture).
- System prompt built from descriptors (only the current type + column fields, keep it short).
- `responseConstraint` = JSON Schema of `Patch[]` restricted to the current type's option paths
  → the model can't invent options. Result is re-validated anyway.
- Input languages are limited (en/es/ja); for Dutch input, run the rules provider first and
  only send the unparsed remainder, or ask the model to translate-then-parse. Verify nl support at implementation time.
- Not available (Firefox/Safari, low-end hardware) → silently falls back to rules.

Both providers: output is always a **proposed diff**, never a silent mutation; unparsed fragments
are echoed back.

### Keeping chat in sync with new options/values

1. Extend `FieldOptionMeta` with optional `keywords?: { en?: string[]; nl?: string[] }`.
   Key name, description and `examples` are used automatically; keywords only for synonyms.
2. `vocabulary.ts` is derived at runtime from the registry → new option = understood by
   `set <option> to …` and by built-in AI without changes.
3. **Drift test** (`vocabulary.spec.ts`): every option in every registry type must be reachable
   by the parser (at least by key), and every enum value must resolve. Fails CI when a new
   value isn't understood.
4. Golden-prompt tests: `intent/__fixtures__/*.json` = `{ input, column, expectedPatches }`
   (e.g. "autocomplete van https://… klein, vertalingen nl fr en").
5. Update CLAUDE.md "Adding an option to an existing field input" with a step:
   *add `keywords` if the option has common synonyms, add a fixture, run the vocabulary spec*.
   Same for the `control-renderer-checklist` skill.

## Docs (phase 1)

- `docs/guide/5.tooling/control-builder.md`: what it is, live `<ClientOnly>` demo
  (form + chat), chat phrase cheat-sheet (EN/NL), built-in AI requirements & fallback.
- Phrase cheat-sheet partly generated from `vocabulary.ts` into `_generated/` (like the
  field-input docs) so it never drifts.
- Picked up by `tools/doc/build-llms.mjs` → `llms.txt` / `llms-full.txt`; add a short
  "how to extend the builder vocabulary" section so agents follow the keyword + fixture steps.

## Steps

1. Core: `describe`, `patch`, `validate`, descriptor snapshot per registry type.
2. Package scaffold (`libs/builder-vue`, private, nx tags) + form UI with crouton-ui-vue.
3. Translations panel (i18n bundles, `labelKey` reuse).
4. Live preview via `buildFormControl` + crouton-forms-vue renderers; JSON pane.
5. Type switching with dropped-options report.
6. `keywords` meta + `vocabulary.ts` + rules provider + drift/golden tests.
7. Built-in AI provider + availability/download UX.
8. Docs page, generated cheat-sheet, llms docs, CLAUDE.md + skill update.

## Out of scope (follow-ups)

Custom control types, layout/table nodes, relations editing, resource-level options,
reading/writing `resource.json` / i18n files, multi-column editing, in-browser WebLLM, MCP provider.
