# CroutonForm

Inline form component with optional auto-save, back-navigation, and readonly support.

Replaces the deprecated `AutoSaveForm` from `@ghentcdh/crouton-forms-vue`.

## Import

```ts
import { CroutonForm } from '@ghentcdh/crouton-vue';
```

## Props

| Prop              | Type                          | Default      | Description                                                                          |
| ----------------- | ----------------------------- | ------------ | ------------------------------------------------------------------------------------ |
| `views`           | `ViewDef`                     | **required** | View definitions object containing `form` and/or `view` keys with schema + ui_schema |
| `data`            | `object`                      | **required** | Initial form data                                                                    |
| `title`           | `string`                      | —            | Optional title shown in header with back button                                      |
| `saveLabel`       | `string`                      | `'Save'`     | Label for save button (normal mode only)                                             |
| `cancelLabel`     | `string`                      | `'Cancel'`   | Label for cancel button (normal mode only)                                           |
| `layout`          | `string`                      | `'rows'`     | Layout direction: `'rows'` for horizontal, anything else for vertical                |
| `errorMode`       | `ErrorMode`                   | `'onBlur'`   | When validation errors are shown                                                     |
| `http`            | `HttpClient`                  | `null`       | HTTP client for remote renderers (falls back to `useApi()`)                          |
| `renderers`       | `any[]`                       | `null`       | Custom renderer registry                                                             |
| `autoSave`        | `boolean`                     | `false`      | Auto-save on change (debounced). Replaces Save/Cancel with status indicator          |
| `onAutoSave`      | `(data: any) => Promise<any>` | `null`       | Called with changed fields when debounce fires and form is valid. Required when `autoSave` is true |
| `onRefreshData`   | `() => Promise<any>`          | `null`       | Re-fetch parent record after relation changes. Cancels pending auto-save             |
| `validateOnMount` | `boolean`                     | `false`      | Run validation and show errors immediately on mount                                  |
| `showButtons`     | `boolean`                     | `true`       | Show footer buttons                                                                  |
| `showErrors`      | `boolean`                     | `false`      | Show validation errors in the UI                                                     |
| `readonly`        | `boolean`                     | `false`      | Render form in readonly mode (uses `view` key from `views`)                          |
| `formMaxWidth`    | `string`                      | `'w-full'`   | Tailwind width class for the form container                                          |
| `formatBeforeSave`| `(data: any) => any`          | `null`       | Transform form data before saving                                                    |
| `resourceApi`     | `ResourceApiInstance`         | —            | Resource API instance for direct CRUD. When set, `onSubmit` saves via API            |
| `saveId`          | `string`                      | `null`       | Record ID for updates via `resourceApi`. Omit for create                             |

### The `views` prop

The `views` object maps view types to their schema definitions. CroutonForm reads `views.form` (edit mode) or `views.view` (readonly mode):

```ts
const views = {
  form: {
    json_schema: { /* JSON Schema */ },
    ui_schema: { /* UI Schema */ },
  },
  view: {
    json_schema: { /* JSON Schema */ },
    ui_schema: { /* UI Schema for readonly */ },
  },
};
```

Each view config supports both new (`json_schema`/`ui_schema`) and legacy (`data`/`ui`) key names.

## Events

| Event          | Payload                       | Description                                                    |
| -------------- | ----------------------------- | -------------------------------------------------------------- |
| `closeModal`   | `CroutonFormData \| null`     | Emitted on cancel (`null`) or after successful submit (`{ data, valid }`) |
| `cancel`       | `null`                        | Emitted when user cancels (back button or Cancel click)        |
| `save`         | `unknown`                     | Emitted on submit when no `resourceApi` is set                 |
| `onSaveSuccess`| `unknown`                     | Emitted after successful save via `resourceApi`                |
| `onSaveError`  | `unknown`                     | Emitted when save via `resourceApi` fails                      |
| `events`       | `FormEventPayload`            | Custom renderer dispatched events (e.g. relation changes)      |
| `errors`       | `unknown`                     | Validation error list changes                                  |
| `valid`        | `boolean`                     | Form validity changes                                          |

### Save flow

CroutonForm supports two save strategies:

1. **With `resourceApi`**: the form calls `resourceApi.create(data)` or `resourceApi.save(saveId, data)` directly, then emits `onSaveSuccess`/`onSaveError` and `closeModal`.

2. **Without `resourceApi`**: the form emits `save` with the data and `closeModal` with `{ data, valid: true }`. The parent handles persistence (e.g. `ResourceTable` uses its `onClose` callback).

### Auto-save mode

When `autoSave` is true:
- Save/Cancel buttons are replaced by a status indicator (`Saving...`, `Saved`, etc.)
- Changes are debounced (800ms) and only changed fields (delta) are sent to `onAutoSave`
- A Retry button appears on save error
- `onRefreshData` cancels pending saves before reloading data after relation changes

## Slots

| Slot             | Description                          |
| ---------------- | ------------------------------------ |
| `title`          | Custom title content (replaces prop) |
| `content-before` | Content before form fields           |
| `content-after`  | Content after form fields            |

## Usage

### Basic form with views

```vue
<CroutonForm
  :views="resource.views"
  :data="record"
  title="Edit Book"
  @close-modal="onClose"
/>
```

### Auto-save form

```vue
<CroutonForm
  :views="resource.views"
  :data="record"
  :auto-save="true"
  :on-auto-save="(data) => api.patch(record.id, data)"
  :on-refresh-data="() => api.get(record.id)"
  title="Edit Book"
/>
```

### With resourceApi (standalone)

```vue
<CroutonForm
  :views="resource.views"
  :data="record"
  :resource-api="bookApi"
  :save-id="record.id"
  @on-save-success="onSaved"
  @on-save-error="onError"
/>
```

## Demo

<AutoSaveFormDemo />

## Migration from AutoSaveForm

`AutoSaveForm` from `@ghentcdh/crouton-forms-vue` is deprecated. Replace with `CroutonForm` from `@ghentcdh/crouton-vue`:

| Before (`AutoSaveForm`)                        | After (`CroutonForm`)                      |
| ---------------------------------------------- | ------------------------------------------ |
| `import { AutoSaveForm } from '@ghentcdh/crouton-forms-vue'` | `import { CroutonForm } from '@ghentcdh/crouton-vue'` |
| `:schema` + `:ui-schema`                       | `:views="{ form: { json_schema, ui_schema } }"` |
| `:modal-title="..."`                           | `:title="..."` (optional)                  |
| No `showButtons` prop                          | `:show-buttons="false"` to hide buttons    |
| No `readonly` prop                             | `:readonly="true"` for readonly mode       |
| Requires explicit `:http` client               | Falls back to `useApi()` automatically     |

### Example

**Before:**
```vue
<AutoSaveForm
  :schema="schema"
  :ui-schema="uiSchema"
  :model-value="data"
  :http="api"
  modal-title="Edit Book"
/>
```

**After:**
```vue
<CroutonForm
  :views="{ form: { json_schema: schema, ui_schema: uiSchema } }"
  :data="data"
  title="Edit Book"
  @close-modal="onClose"
/>
```
