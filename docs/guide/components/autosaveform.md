# CroutonForm

Inline form component with optional auto-save, back-navigation, and readonly support.

Replaces the deprecated `AutoSaveForm` from `@ghentcdh/crouton-forms-vue`.

## Import

```ts
import { CroutonForm } from '@ghentcdh/crouton-vue';
```

## Props

| Prop              | Type                          | Default      | Description                                                   |
| ----------------- | ----------------------------- | ------------ | ------------------------------------------------------------- |
| `title`           | `string`                      | —            | Optional title shown in header with back button               |
| `schema`          | `object`                      | **required** | JSON schema describing form data shape                        |
| `uiSchema`        | `object`                      | **required** | UI schema describing layout and controls                      |
| `data`            | `object`                      | **required** | Initial form data                                             |
| `saveLabel`       | `string`                      | `'Save'`     | Label for save button                                         |
| `cancelLabel`     | `string`                      | `'Cancel'`   | Label for cancel button                                       |
| `errorMode`       | `ErrorMode`                   | `'onBlur'`   | When validation errors are shown                              |
| `http`            | `HttpClient`                  | `null`       | HTTP client for remote renderers (falls back to `useApi()`)   |
| `renderers`       | `any[]`                       | `null`       | Custom renderer registry                                      |
| `autoSave`        | `boolean`                     | `false`      | Auto-save on change (debounced). Replaces Save/Cancel buttons |
| `onAutoSave`      | `(data: any) => Promise<any>` | `null`       | Called on debounced save when form is valid                    |
| `onRefreshData`   | `() => Promise<any>`          | `null`       | Re-fetch parent record after relation changes                 |
| `validateOnMount` | `boolean`                     | `false`      | Run validation immediately on mount                           |
| `showButtons`     | `boolean`                     | `true`       | Show footer buttons                                           |
| `readonly`        | `boolean`                     | `false`      | Render form in readonly mode                                  |

## Events

| Event        | Payload              | Description                       |
| ------------ | -------------------- | --------------------------------- |
| `closeModal` | —                    | Emitted on submit or cancel       |
| `events`     | `FormEventPayload`   | Custom renderer dispatched events |
| `errors`     | validation errors    | Validation error changes          |
| `valid`      | `boolean`            | Form validity changes             |

## Slots

| Slot             | Description                          |
| ---------------- | ------------------------------------ |
| `title`          | Custom title content (replaces prop) |
| `content-before` | Content before form fields           |
| `content-after`  | Content after form fields            |

## Demo

<AutoSaveFormDemo />

## Migration from AutoSaveForm

`AutoSaveForm` from `@ghentcdh/crouton-forms-vue` is deprecated. Replace with `CroutonForm` from `@ghentcdh/crouton-vue`:

| Before (`AutoSaveForm`)                        | After (`CroutonForm`)                      |
| ---------------------------------------------- | ------------------------------------------ |
| `import { AutoSaveForm } from '@ghentcdh/crouton-forms-vue'` | `import { CroutonForm } from '@ghentcdh/crouton-vue'` |
| `:modal-title="..."` | `:title="..."` (optional)                            |
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
  :schema="schema"
  :ui-schema="uiSchema"
  :model-value="data"
  title="Edit Book"
/>
```
