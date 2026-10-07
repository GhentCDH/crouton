# File upload control — implementation plan

**Goal**: a `file` control renderer (single + multiple, drag & drop, progress) whose value is a structured object.
Crouton **never** stores a byte: the resource's `hooks.ts` gets an `uploadFile`
hook and decides where the file goes (S3, disk, a CDN, whatever). Crouton owns the wire contract, the route, the
validation and the UI.

Decisions taken up front:

| Question                  | Answer                                                                                      |
|---------------------------|---------------------------------------------------------------------------------------------|
| Where does storage happen | Backend hook only — `POST /<route>/upload` → `hooks.uploadFile()`                           |
| Field value shape         | Always an object (`CroutonFile`), array of objects when multiple                            |
| v1 scope                  | single + multiple, drag & drop + progress, readonly/view renderer                           |
| Out of scope for v1       | table cell renderer, image cropping, resumable/chunked uploads, direct-to-S3 presigned flow |

---

## 1. The contract — `CroutonFile` (crouton-core)

One definition, used by the column type, the backend response validation and the frontend renderer.

New file `packages/crouton-core/src/lib/resource/File.schema.ts`:

```ts
export const CroutonFileSchema = z.object({
  url: z.string(),                 // required — where the file can be fetched
  filename: z.string(),            // original name, shown in the UI
  mimeType: z.string().optional(),
  size: z.number().int().optional(),
  /** Free-form slot for the hook: storage key, checksum, width/height, … */
  meta: z.record(z.string(), z.unknown()).optional(),
});
export type CroutonFile = z.infer<typeof CroutonFileSchema>;

/** The same shape as a JSON Schema fragment (for column type expansion). */
export const croutonFileJsonSchema: JsonSchemaFragment = { … };
```

Rationale: `url` is the only field the renderer strictly needs; `filename`/`mimeType`/`size` make the readonly view and
the chip label useful without a second request; `meta` keeps crouton out of the business of guessing what a storage
backend wants to remember.

### Column type shorthands

`ColumnType.schema.ts` gains two shorthands next to the existing ones:

- `file` → `croutonFileJsonSchema`
- `file[]` → `{ type: 'array', items: croutonFileJsonSchema }`

so `ColumnTypeShorthandSchema` becomes `z.enum([... , 'file', 'file[]'])` and `SHORTHAND_FRAGMENTS`
gets the two entries. `columnTypeName('file')` returns `'object'`, `'file[]'` returns `'array'` — existing predicates
(`isObjectColumnType`, `isArrayColumnType`) keep working unchanged.

### resource.json usage

```jsonc
"columns": {
  "cover": {
    "type": "file",
    "label": "Cover image",
    "fieldInput": {
      "type": "file",
      "options": { "accept": "image/*", "maxSize": 5242880 }
    }
  },
  "attachments": {
    "type": "file[]",
    "fieldInput": { "type": "file", "options": { "maxFiles": 10 } }
  }
}
```

`multiple` is **derived** from the column being an array — never hand-written. An explicit
`options.multiple` is honoured but the two must agree; a mismatch is a load-time error (see §3.4).

For a Prisma resource the underlying column is a `Json` (or `Json[]`) field — no schema change in crouton; that is the
app's Prisma model.

---

## 2. Control options (crouton-core `control.builder.ts`)

```ts
ControlType.file = 'file';

export interface FileOptions extends ControlOption {
  format: 'file';
  /** `accept` attribute for the input + client-side pre-check, e.g. "image/*,.pdf". */
  accept?: string;
  /** Max bytes per file. Also enforced server-side. */
  maxSize?: number;
  /** Derived from the column type; array column ⇒ true. */
  multiple?: boolean;
  /** Only when multiple. */
  maxFiles?: number;
  /** Injected server-side — where the renderer POSTs. See §3.5. */
  uploadUri?: string;
}
```

Plus a builder method `ControlBuilder.file(options?: Partial<FileOptions>)` mirroring `.date()` /
`.markdown()`, and `FileOptions` exported from `crouton-core` → re-exported from
`crouton-forms-vue/index.ts` (that index re-exports every option type explicitly — easy to miss).

### form-schema.builder

`buildFormControl` gets an explicit branch **before** the generic `else` (same reason the date branch exists — so the
file options survive into the uischema and `multiple` gets derived):

```ts
} else if (fieldInput?.type === 'file') {
  const options: any = { ...(fieldInput.options as object | undefined) };
  if (!options.colspan) options.colspan = 12;
  options.multiple = options.multiple ?? isArrayColumn(col);
  control.control('file', options).width('full');
}
```

`defaultControlFormat(col)` is *not* changed: a `type: "file"` column with no `fieldInput` would fall through to
`object`/`array`. Decide: I propose also mapping it — if the column's expanded fragment came from the `file`/`file[]`
shorthand, default the format to `file`. That requires a marker on the fragment; use `format: 'crouton-file'` inside
`croutonFileJsonSchema` (a JSON Schema `format` on the object) and test for it. Cheap, keeps `fieldInput` optional for
the common case.

---

## 3. Backend — `crouton-api`

### 3.1 The hook

`hooks/hooks.types.ts`:

```ts
/** Framework-agnostic DTO — deliberately NOT multer's Express.Multer.File, so a
 *  hooks.ts file never imports multer types. */
export interface UploadedFile {
  buffer: Buffer;
  filename: string;    // original client filename, already basename-sanitised
  mimeType: string;
  size: number;
}

export interface UploadHookContext<PRISMACLIENT> {
  prisma: PRISMACLIENT;
  /** Resource name, e.g. "book". */
  resource: string;
  /** Column the upload is for, when the client sent one. */
  column?: string;
  /** Record id, when uploading against an existing record. */
  id?: string | number;
  request?: any;
}

uploadFile ? : (file: UploadedFile, ctx: UploadHookContext<any>) => Promise<CroutonFile> | CroutonFile;
```

Added to `ResourceHooksSchema` as an optional `z.custom<…>()` like the others, exported from
`hooks/index.ts` and from the package root.

> Deliberately **no** `deleteFile` hook in v1. Removing a file from the form only clears the field;
> orphan cleanup is the app's job (an `afterWrite` hook can diff old/new). Note this in the docs so
> nobody assumes crouton garbage-collects.

Example the docs will carry:

```ts
// resources/book/hooks.ts
const hooks: ResourceHooks = {
  uploadFile: async (file, ctx) => {
    const key = `${ctx.resource}/${crypto.randomUUID()}-${file.filename}`;
    await s3.putObject({ Bucket: 'my-bucket', Key: key, Body: file.buffer, ContentType: file.mimeType });
    return {
      url: `https://cdn.example.org/${key}`,
      filename: file.filename,
      mimeType: file.mimeType,
      size: file.size,
      meta: { key },
    };
  },
};
```

### 3.2 The route — `operations/register-upload.ts`

`POST /<route>/upload`, multipart, field `file`; optional form fields `column` and `id`.

Follows the existing `register-actions.ts` pattern (`def` / `desc` / decorator application on the dynamically-built
controller class):

```
UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize } }))
UploadedFile()  → param 0
Body()          → param 1   ({ column?, id? })
Req()           → param 2
```

Handler:

1. no `uploadFile` hook → `501 Not Implemented` with an actionable message:
   `Resource "book" has a file column but no uploadFile hook. Add resources/book/hooks.ts exporting { uploadFile }.`
2. no file in the request → `400`.
3. `accept` / `maxSize` re-checked server-side from the column's options (the client check is UX only).
4. call the hook, then `CroutonFileSchema.parse(result)` — a hook returning junk yields a `500` naming the offending
   hook rather than silently poisoning the form value.
5. respond `{ data: <CroutonFile> }` (matches the envelope every other endpoint uses).

Registered from `register-endpoints.ts` only when the resource has ≥ 1 file column.

### 3.3 Multipart without an adapter lock-in

`FileInterceptor` lives in `@nestjs/platform-express` (multer). crouton-api currently declares neither.

- add `@nestjs/platform-express` and `multer` to `peerDependencies` with
  `peerDependenciesMeta: { optional: true }`, and `@types/multer` to devDependencies;
- resolve it **dynamically** in the async `loader/module.loader.ts` (`await import('@nestjs/platform-express')`), stash
  the result in a module-level holder that `register-upload.ts` reads — `createCrudController`
  is synchronous, so the import cannot live there;
- if the import fails (Fastify app, or the package genuinely absent): skip route registration and push a warning into
  `resource-load-report.registry.ts` so it surfaces on the status page instead of a mystery 404.

Max size: `crouton.json` → `upload: { maxFileSize?: number }` (default 10 MB), used as the interceptor limit; per-column
`maxSize` is checked in the handler and must be ≤ the global limit.

### 3.4 Load-time validation

In the resource loader, for each column whose type is `file`/`file[]`:

- `fieldInput.options.multiple` present and disagreeing with the column's array-ness → load error;
- resource has file columns but no `uploadFile` hook → load **warning** in the report registry (not fatal — you may be
  scaffolding, and the 501 explains itself at runtime).

### 3.5 Telling the frontend where to POST

Relation columns already get their URIs injected server-side (`adapter/resource-resolver.ts` /
`column-enrichment.ts`). Do the same here: when building the form view, set
`options.uploadUri = \`${baseUrl}/${route}/upload\`` on every file control.

Also add `upload: { uri, method: 'post' }` to `buildResourceOperations` / `buildDefinitionPayload`
(gated on the resource having file columns) so the descriptor is self-describing, and widen the frontend `Operations`
zod in `controls/resource.ts` with `upload: OperationsSchema.optional()`. The renderer reads `options.uploadUri`; the
descriptor entry is for discoverability and for anyone building against the API directly.

---

## 4. Frontend — `crouton-forms-vue`

### 4.1 Tester

`testers/tester.ts`:

```ts
export const isFileControl = and(uiTypeIs('Control'), optionIsIgnoreCase('format', ControlType.file));
```

Registered in `forms/renderers/controls/index.ts` at **rank 13**:

```ts
{ tester: rankWith(13, isFileControl), renderer: markRaw(FileControlRenderer) },
```

13 because it must beat `isStringFormat` (10), `isObjectControl` (11) **and** `isArrayRenderer` (12) — a `file[]` column
is an array schema and would otherwise be eaten by `ArrayRenderer`.
`isObjectControl` must also learn to bow out on `format: 'file'`, exactly as it already does for
`date-range` / `relation` / `select` (there is a test for that list — extend it).

### 4.2 `useFileUpload.ts` — all the logic, plain TypeScript

Kept deliberately free of component code so it is unit-testable under the existing vitest config (which has **no** vue
plugin and **no** jsdom — see §5).

```ts
export type UploadItemStatus = 'pending' | 'uploading' | 'done' | 'error';

export interface UploadItem {
  id: string;               // local uuid
  filename: string;
  size: number;
  status: UploadItemStatus;
  progress: number;         // 0–100
  error?: string;
  value?: CroutonFile;      // set on success
}

export const createFileUploader = (deps: {
  http: HttpClient;
  uploadUri: string;
  column?: string;
  options: FileOptions;
  onValue: (value: CroutonFile | CroutonFile[] | null) => void;
}) => ({ items, add(files: File[]), cancel(id), retry(id), remove(id) });
```

Behaviour:

- **validate before sending** — `accept` (mime + extension globs), `maxSize`, `maxFiles`. A rejected file becomes an
  `error` item, it is not sent.
- **request**: `FormData` with `file` (+ `column`), `http.post(uploadUri, form, { signal, onUploadProgress })`.
  `onUploadProgress` is axios-specific; where it doesn't fire the bar renders indeterminate rather than staying at 0.
  `HttpClient` needs no interface change — `config` is already `any` passthrough.
- **abort** via one `AbortController` per item; `cancel` removes the item.
- **concurrency** capped at 2 sequentially-queued uploads to keep progress readable.
- **value writing**: single → `CroutonFile | null`; multiple → `CroutonFile[]` in item order, containing only `done`
  items. `null`/`[]` when everything is cleared (not `undefined` — the field must be dirty so autosave picks up the
  clear).
- response parsed with `CroutonFileSchema` — a malformed backend response becomes a per-item error, never a corrupt form
  value.

### 4.3 Components

```
forms/renderers/controls/file/
├── FileControlRenderer.vue          # binds useControlBinding + createFileUploader
├── FileControlRenderer.properties.ts
├── FileDropzone.vue                 # drag & drop + click-to-browse + hidden <input type=file>
├── FileDropzone.properties.ts
├── FileUploadItem.vue               # name, size, progress bar, cancel/retry/remove
├── FileUploadItem.properties.ts
├── useFileUpload.ts
├── file.utils.ts                    # formatBytes, matchesAccept, isImage
├── index.ts
└── __tests__/{useFileUpload,file.utils}.spec.ts
```

Per `CLAUDE.md`: arrow functions everywhere, and props via a runtime object in a separate
`*.properties.ts` (the older renderers use `defineProps<{…}>()` — new files follow the documented rule).

- The renderer wraps its content in `ControlWrapper` from `@ghentcdh/ui` bound to `wrapper`, so the label / required
  marker / error slot look identical to `Input`.
- Dropzone uses a drag-enter/leave **counter** (not a boolean) so child elements don't flicker the highlight;
  `@dragover.prevent`, `@drop.prevent`. Keyboard accessible (button role, Enter/Space opens the picker).
- Existing values (edit form) hydrate into `done` items with `progress: 100`.
- Image items show a thumbnail from `value.url`; everything else gets a file icon.
- Disabled/readonly (`wrapper.enabled === false`) hides the dropzone and shows the list only.

### 4.4 Readonly / view renderer

No new registry entry — the readonly path funnels through `ControlReadonlyRenderer` →
`useReadonlyBinding._getComponent`. Add there, **before** the `typeof value === 'object'` →
`ObjectValue` fallback:

```ts
if (isFileControl(uiSchema, schema)) return FileValue;
```

New `readonly/displayValue/FileValue.vue` (+ `.properties.ts`): one row per file — thumbnail for images, filename as an
`<a href=url target=_blank rel=noreferrer>`, human-readable size. Empty value falls through to the existing
`NotSetValue`. Handles both the single object and the array.

---

## 5. Tests

`crouton-forms-vue`'s vitest config has `include: ['src/**/*.{test,spec}.ts']`, no `@vitejs/plugin-vue`
and no jsdom — **`.vue` files cannot be mounted today**. That is why all the logic sits in
`useFileUpload.ts` / `file.utils.ts`. v1 tests are pure TS:

| Package           | Test                          | What it pins                                                                                                                                                                                               |
|-------------------|-------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| crouton-core      | `ColumnType.schema.spec.ts`   | `file` / `file[]` expand correctly; `columnTypeName` → object/array                                                                                                                                        |
| crouton-core      | `form-schema.builder.spec.ts` | file branch emits `format: 'file'`, derives `multiple`, passes `accept`/`maxSize` through                                                                                                                  |
| crouton-forms-vue | `tester.spec.ts`              | `isFileControl` matches; `isObjectControl`/`isArrayRenderer` do **not** hijack a file control                                                                                                              |
| crouton-forms-vue | `useFileUpload.spec.ts`       | fake `HttpClient`: success → value shape (single vs multiple); progress events; abort; server error → item error not form corruption; `maxSize`/`accept`/`maxFiles` rejection; malformed response rejected |
| crouton-forms-vue | `file.utils.spec.ts`          | `matchesAccept` (`image/*`, `.pdf`, comma lists), `formatBytes`                                                                                                                                            |
| crouton-api       | `upload.controller.spec.ts`   | 200 with hook (mirrors `custom-resource.controller.spec.ts`); 501 without hook; 400 without file; 413/400 over `maxSize`; hook returning junk → 500                                                        |
| crouton-api       | loader spec                   | file column + no hook ⇒ warning in the load report, resource still loads                                                                                                                                   |

**Optional follow-up** (own commit, do not block v1): add `@vitejs/plugin-vue`, `jsdom` and
`@vue/test-utils` to crouton-forms-vue and cover `FileDropzone` drag/drop events. Worth doing — that package has zero
component tests today — but it is test infrastructure, not this feature.

**Manual verification** (there is no demo app in the repo): scaffold with `create-crouton`, add a
`file` column and a `hooks.ts` writing to `./uploads` with a static-serve, then check: drop a file → progress → save →
reopen the edit form → value hydrates → view modal shows the link; array column with 3 files; oversized file rejected
client-side; delete the hook → 501 with the actionable message.

---

## 6. Documentation

- `docs/guide/resource/hooks.md` — new `uploadFile` section (signature, `UploadedFile`, `CroutonFile`, the S3 example,
  and the explicit "crouton does not delete orphaned files" note).
- `docs/guide/resource/resource-json.md` — `file` / `file[]` column types and `fieldInput` options table.
- `docs/guide/1. setup/frontend.md` — what the control looks like, how to override it with a custom renderer.
- `RELEASE_NOTES.md` / `CHANGELOG.md` entry.
- Regenerate `resource.schema.json` (`scripts/gen-resource-schema.mjs`) after the ColumnType change.

---

## 7. Commit breakdown

Small, independently reviewable, each green on `nx run-many -t build test lint`:

1. `feat(core): add CroutonFile contract and file column types`
2. `feat(core): add file control type, options and form-schema branch`
3. `feat(api): add uploadFile hook and POST /<route>/upload`
4. `feat(api): inject uploadUri into file controls and advertise the upload operation`
5. `feat(forms-vue): add file upload control renderer with drag & drop and progress`
6. `feat(forms-vue): render uploaded files in the readonly view`
7. `docs: document the file column, upload hook and control`

Commit messages get written out in markdown for copy/paste when the work is done — no MR opened from here.

---

## 8. Risks / things to watch

- **`@nestjs/platform-express` coupling.** The dynamic-import escape hatch keeps Fastify users running, but it is the
  one piece of this plan that can silently no-op. The load-report warning is what makes it visible — do not skip it.
- **Rank collision.** `file[]` vs `ArrayRenderer` (rank 12) is a real conflict; the rank-13 entry *and* the
  `isObjectControl` exclusion both need their own test, or a future renderer at rank 13+ will quietly break it.
- **Auth on the upload route.** It inherits whatever guard the generated controller has — verify against the
  `AUTH_PLAN.md` setup that a file upload is not accidentally more public than the resource's `create`.
- **Body size limits.** The Nest/Express `bodyParser` limit is separate from multer's `fileSize`; the scaffold templates
  may need `app.use(json({ limit }))` guidance in the docs.
- **`ResourceHooks` and `z.infer`.** Per the earlier custom-resource work, `z.infer` erases the
  `PRISMACLIENT` generic — `ctx.prisma` in `uploadFile` will be `any`, same as the existing hooks. Don't fight it here;
  it is a pre-existing wart tracked separately.
