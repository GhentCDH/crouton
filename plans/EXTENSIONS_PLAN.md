# Resource Extensions Plan (registered top-level sections in `resource.json`)

## Goal

Let another application build on the Crouton `resource.json` contract by adding its own
**top-level sections** — e.g. `annotation`, `context` — that Crouton validates, carries
through the pipeline, and re-emits on the served schema payloads. Crouton stays the source of
truth for the standard resource shape; the consuming app owns the shape and meaning of each
extension.

Target author-facing shape (from the request — extension keys sit as siblings of `columns`):

```json
{
  "id": "example",
  "name": "Example",
  "annotation": {
    "color": "#4fff66",
    "isRoot": false,
    "allowedChildren": ["lemma"],
    "allowedLinks": []
  },
  "columns": { "...": "..." }
}
```

Decisions locked with Bo (2026-09-03):
- **Placement: top-level keys** (`annotation` as a sibling of `columns`), not a nested
  `extensions` block in the authored file.
- **Validation: registered typed schemas.** A consuming app registers a Zod schema per
  extension name; the loader validates against it and rejects unknown/mistyped keys.
- **Scope v1: resource-level only.** Per-column extension blocks are a documented follow-up.
- Fully additive & backward compatible: no extension registered ⇒ behaviour is exactly as
  today. No `schemaVersion` bump (same reasoning as the custom-kind and layout work).

---

## The core tension (and how we resolve it)

Two of the decisions pull against each other:

1. **Top-level keys** means `annotation` is a sibling of `columns` in the file.
2. `ResourceJsonShape` is a strict `z.object`, so it **strips every unknown top-level key**.
   Today `annotation` would be silently dropped by `ResourceJsonSchema.safeParse` in
   `ReadResourceJson.ts` — the data never reaches `fromJson` or the payloads.

We keep typo protection *and* top-level authoring by making the parse schema
**registry-aware**: the effective object shape is `ResourceJsonShape` **extended with the
currently-registered extension key→schema pairs**. A top-level key that is neither a core key
nor a registered extension is still stripped/flagged (so `colums` typos still surface); a
registered `annotation` is validated by its registered schema and survives.

Internally we **normalize** the validated extension keys off the top level into a single
`extensions: Record<string, unknown>` field (in the `.transform`), mirroring how `columns` is
authored as a map and normalized to an array. Downstream code and the served payloads then
have one obvious block to read, and the static `Resource` type never has to enumerate
app-specific keys.

---

## How the current pipeline works (context)

`resource.json` → `ResourceJsonSchema.safeParse` (`ReadResourceJson.ts`) →
`ResourceJsonShape` (strict `z.object`) `.superRefine(refineByKind)` `.transform(...)` →
`fromJson(json, …)` (`json-adapter.ts`) spreads `...json` into a `Resource` and derives
`views`/`definition`/`lookup` → served by the payload builders:

- `buildViewsPayload` → `GET /schemas` → `{ id, name, route, uri, title, …, schemas, actions }`
- `buildDefinitionPayload` → `GET /definition` → `{ name, route, idType, tag, operations, schemas }`
- `buildResourceJsonPayload` → `GET /resource.json` → `{ id, uri, operations, schema }`

`ResourceSchema` (crouton-api `ResourceConfig.schema.ts`) is `ResourceJsonShape.extend({...})`,
so any field added to the shape flows into the `Resource` type automatically. The app is wired
in `crouton-api.module.ts`: `CroutonAppConfig` (`baseUrl`, `prefix`, `security`) →
`forResources(...)` loads enums, data sources, then resource configs.

Precedent for extension keys already exists in the codebase: `FieldInput.schema.ts` and
`ColumnType.schema.ts` use `.catchall(z.unknown())` / `x-*` vendor extensions.

`ResourceJsonSchema` is consumed as a **module-level constant** in ~4 places:
`ReadResourceJson.ts`, `WriteResourceJson.ts`, `crouton-codegen/src/project.ts`, and specs.
The registry must be populated before any of these parse a file that carries extensions.

---

## Design

### 1. Extension registry (`crouton-core`, new `resource/extensions.ts`)

A module-level singleton mapping extension name → Zod schema.

```ts
import type { ZodType } from 'zod';

const registry = new Map<string, ZodType>();

export const registerResourceExtension = (name: string, schema: ZodType): void => {
  // reserve against collisions with core keys — a registered `columns` must be rejected
  if (CORE_RESOURCE_KEYS.has(name)) throw new Error(`Extension "${name}" shadows a core key.`);
  registry.set(name, schema);
};
export const registerResourceExtensions = (map: Record<string, ZodType> = {}): void =>
  Object.entries(map).forEach(([k, s]) => registerResourceExtension(k, s));
export const getResourceExtensions = (): ReadonlyMap<string, ZodType> => registry;
export const clearResourceExtensions = (): void => registry.clear(); // for tests
```

`CORE_RESOURCE_KEYS` = `new Set(Object.keys(ResourceJsonShape.shape))` — the guard that keeps a
registered extension from shadowing (or being shadowed by) a core key.

### 2. Registry-aware parse schema (`resource/ResourceJson.schema.ts`)

Replace the constant `ResourceJsonSchema` with a small builder, and keep a convenience const
that reads the registry at call time.

```ts
export const buildResourceJsonSchema = () => {
  const ext = getResourceExtensions();
  const extShape = Object.fromEntries(
    [...ext].map(([name, schema]) => [name, schema.optional()]),
  );
  const shape = ext.size ? ResourceJsonShape.extend(extShape) : ResourceJsonShape;
  return shape.superRefine(refineByKind).transform((obj) => {
    const title = obj.title ?? labelFromId(obj.name);
    const schemaVersion = obj.schemaVersion ?? BASELINE_RESOURCE_VERSION;
    // Lift registered extension keys off the top level into a normalized block.
    const extensions: Record<string, unknown> = {};
    for (const name of ext.keys()) {
      if (obj[name] !== undefined) extensions[name] = obj[name];
      delete (obj as Record<string, unknown>)[name];
    }
    return {
      title,
      ...obj,
      schemaVersion,
      columns: normalizeColumns(obj.columns),
      ...(Object.keys(extensions).length && { extensions }),
    };
  });
};
```

- Add `extensions: z.record(z.string(), z.unknown()).optional()` to `ResourceJsonShape` as the
  **normalized home** (so `Resource` types it and `...json` carries it), but authors never
  write it directly — the transform fills it from the top-level keys.
- Keep the existing exported name working: either export `ResourceJsonSchema` as a getter, or
  change the ~4 call sites to `buildResourceJsonSchema()`. **Recommendation: change the call
  sites** — explicit, no hidden module-load-order coupling. `refineByKind` and the transform
  body are unchanged apart from the extension-lift.

Why a builder rather than one lazy constant: the four call sites are few and known, the
registry is fixed once at bootstrap, and an explicit `buildResourceJsonSchema()` is far easier
to reason about and unit-test than a `z.lazy`/`z.custom` that re-reads a mutable singleton on
every parse.

### 3. Thread through the adapter (`crouton-api/json-adapter.ts` + `ResourceConfig.schema.ts`)

- `ResourceSchema` inherits `extensions` from `ResourceJsonShape` automatically (it does
  `.extend`), so `Resource` gains `extensions?: Record<string, unknown>` for free.
- `fromJson` already does `...json`, so `extensions` flows through. Add an explicit line for
  clarity next to the other optional spreads:
  `...(json.extensions && { extensions: json.extensions }),`.

### 4. Emit on the served payloads (`crouton-api/payload-builders.ts`)

Add the normalized block to the three read payloads, spread-guarded so nothing changes when a
resource has no extensions:

- `buildViewsPayload` (`GET /schemas`) — the primary one the annotation app consumes:
  `...(config.extensions && { extensions: config.extensions }),`
- `buildDefinitionPayload` (`GET /definition`) — same.
- `buildResourceJsonPayload` (`GET /resource.json`) — same.

`buildSubResourceViewsPayload` is out of scope for v1 (resource-level only). The served shape
becomes: the standard payload plus a sibling `extensions: { annotation: {...}, context: {...} }`.

### 5. App-config wiring (`crouton-api/crouton-api.module.ts`)

- Extend `CroutonAppConfig`:
  ```ts
  /** App-defined resource.json extension sections, keyed by top-level name. */
  extensions?: Record<string, ZodType>;
  ```
- In `forResources(...)`, **before** `loadResourceConfigsFromDir(...)`, call
  `registerResourceExtensions(appConfig.extensions)`. This is the ordering contract: register
  first, parse second. Document it and assert it (a resource load that hits an unregistered
  top-level key should record a `resourceLoadErrorsRegistry` entry, not crash).

### 6. Non-app parse sites (codegen / CLI / editor) — data-loss guard

These parse `resource.json` **without** the app config, so the registry is empty and extension
keys would be stripped. Audit each:

- `WriteResourceJson.ts` — already documented to validate only and write the **raw** object
  back verbatim (see `custom_resource_kind.md`), so it does **not** drop extensions. Confirm
  with a round-trip test.
- `crouton-codegen/src/project.ts` — uses `parsed.data`; verify it does not re-serialize
  resource.json from the parsed (extension-stripped) object. If it does, either (a) have codegen
  load the same registry, or (b) treat unknown top-level keys as opaque passthrough in codegen
  only. **Recommend (b)**: codegen should never lose author data it doesn't understand.
- Editor (`crouton-editor-vue`) settings subset omits keys deliberately — no change, but note
  that the visual editor won't edit extension blocks in v1.

### 7. Editor autocomplete / generated JSON Schema (trade-off of top-level keys)

`gen-resource-schema.mjs` runs at **crouton-core build time**, when no app has registered
anything, so the committed `resource.schema.json` cannot list `annotation`/`context`. With a
strict base object, an editor validating against that file would flag the extension keys as
"not allowed" even though runtime accepts them.

Resolution: expose `generateResourceJsonSchema()` from crouton-core that runs
`z.toJSONSchema` over the **registry-extended** shape, and let the consuming app emit its own
`resource.schema.json` (with `annotation`/`context` documented) after registering its
extensions. The core committed schema stays extension-agnostic. Document this clearly — it is
the price of top-level authoring vs a single opaque `extensions` block. (Same `z.toJSONSchema`
caveats as the layout plan: recursive/record schemas can trip Zod-v4 `toJSONSchema`; wrap in
try/catch and let a registered extension supply an explicit JSON-Schema fragment if needed.)

---

## Testing / verification

Core (vitest — mind crouton-core's vitest-config gap noted in `custom_resource_kind.md`;
ensure new specs actually run):
- Register `annotation` → parse a file with a valid `annotation` block → it appears under
  `resource.extensions.annotation`, not at top level, and is validated.
- Invalid `annotation` (wrong type) → `safeParse` error (proves typed validation, not
  passthrough).
- Unregistered top-level key (`annotation` with nothing registered) → stripped, and a
  mistyped core key (`colums`) still surfaces as before (typo protection intact).
- `registerResourceExtension('columns', …)` → throws (core-key collision guard).
- **Backward-compat snapshot:** no extension registered ⇒ parsed output byte-identical to
  today for an existing fixture resource.
- Round-trip: `WriteResourceJson` preserves an extension block verbatim.

API:
- `buildViewsPayload` / `buildDefinitionPayload` / `buildResourceJsonPayload` include
  `extensions` when present and omit the key entirely when absent.
- `forResources` registers before load; a resource with an extension for which no schema is
  registered is recorded in `resourceLoadErrorsRegistry` (status page), not fatal.

Full pipeline: one real resource with `annotation` end-to-end (`createCroutonApp({ extensions:
{ annotation } })`) and assert `GET /<route>/schemas` returns the standard payload + the
`annotation` block.

## Rollout / sequencing

1. Registry + core-key guard (`resource/extensions.ts`) and exports.
2. `buildResourceJsonSchema()` + `extensions` on `ResourceJsonShape` + extension-lift in the
   transform; update the ~4 call sites. Core tests incl. backward-compat snapshot.
3. `CroutonAppConfig.extensions` + register-before-load wiring in `crouton-api.module.ts`.
4. `fromJson` + `ResourceSchema` typing; `extensions` on the three payload builders. API tests.
5. Codegen/CLI/editor round-trip audit (step 6) — the data-loss guard.
6. `generateResourceJsonSchema()` helper + docs (authoring an extension, registering it,
   emitting an app-specific `resource.schema.json`).

Steps 1–4 are the functional core and independently shippable; a consuming app can read
`extensions` off `/schemas` after step 4. Steps 5–6 harden round-tripping and DX.

## Open questions

- **Column-level extensions** (an `annotation` block *inside* a column) — deferred to v2.
  `JsonColumnSchema` already has `.catchall(z.unknown())`, so the raw data survives today; a v2
  would add a per-column registry + normalization and surface it in the column payloads. Confirm
  v1 resource-level-only is enough for the annotation app.
- **Sub-resources**: `buildSubResourceViewsPayload` omits `extensions` in v1 — confirm fine.
- **Editor**: no visual editing of extension blocks in v1 (round-trips untouched) — confirm.
- **Schema emission**: ship `generateResourceJsonSchema()` in v1, or document manual authoring
  of the app-side `resource.schema.json` and defer the helper?
