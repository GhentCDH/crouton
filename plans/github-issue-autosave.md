# feat: Auto-save form fields on edit

## Summary

Replace the explicit **Save** button in edit/create modals with automatic saving as the user edits fields. The feature is opt-in globally via `crouton.json` and can be disabled at any time without code changes.

---

## Motivation

Currently every edit requires the user to manually click **Save**. For data-heavy admin panels — where users frequently open a record, tweak one field, and move on — this is friction. Auto-save removes that step while keeping the same safety guarantees (nothing is persisted until the form is valid).

---

## Proposed behaviour

### Edit mode

- Any field change starts an 800 ms debounce timer.
- When the timer fires **and the form is valid**, the record is `PATCH`ed automatically.
- The Save button is replaced by a **Close** button. A small status indicator sits next to it:

  | State | Message |
  |-------|---------|
  | idle | *(empty)* |
  | saving | Saving… |
  | saved | Saved ✓ |
  | pending | Fill required fields to save |
  | error | Save failed — **Retry** |

### Create mode

Create mode is the tricky case — no ID exists yet.

- While the form is **invalid** (required fields missing): nothing is sent. The indicator shows *"Fill required fields to save"*.
- On the **first valid save**: `POST` is called, the record is created, and its new ID is stored in memory. The row appears in the table immediately.
- All **subsequent saves**: `PATCH` against the newly created ID.
- If the user closes the modal before the form ever becomes valid: **no record is created** — no orphan rows.

### Global kill-switch

Add an `autoSave` flag to `crouton.json` (default: `true`). Setting it to `false` restores the classic Save/Cancel buttons across the whole application with no code changes needed.

```json
{
  "autoSave": false
}
```

---

## Implementation plan

### 1 · `useAutoSave` composable — `crouton-forms-vue`

New file: `src/composables/useAutoSave.ts`

```ts
export type AutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

export function useAutoSave(options: {
  onSave: (data: any) => Promise<any>
  debounceMs?: number  // default 800
}): { status: Ref<AutoSaveStatus>, trigger(data: any, isValid: boolean): void }
```

- `trigger` is called on every form `change` event.
- Cancels any pending debounce when a new change arrives (no stale requests).
- Sets `status` through the lifecycle: `pending` → `saving` → `saved` / `error`.

### 2 · `FormModal` props + UI — `crouton-forms-vue`

**`FormModal.properties.ts`**
```ts
autoSave:   { type: Boolean, default: false }
onAutoSave: { type: Function as PropType<(data: any) => Promise<any>>, default: null }
```

**`FormModal.vue`**
- Wire `onChange` → `autoSave.trigger(data, valid)` when `autoSave` prop is true.
- Replace Save/Cancel with a single **Close** button + status line.
- Keep full Save/Cancel when `autoSave` is false (no behaviour change).

**`FormModalService.ts`** — pass `autoSave` and `onAutoSave` through to props.

### 3 · Global flag — `crouton-codegen` + `crouton-vue`

**`crouton-codegen/src/config.ts`** — add to `CroutonConfig`:
```ts
/** Disable auto-save and fall back to explicit Save buttons. Default: true. */
autoSave?: boolean
```

**`crouton-api` module** — expose `autoSave` in the `/_app/layout` response.

**`crouton-vue/src/composables/useCrouton.ts`** — add to `AppConfig`:
```ts
export const AppConfig = {
  VERSION: 'unknown',
  title: 'Crouton',
  autoSave: true,
}
```
Read from the `/_app/layout` response in `init()`.

### 4 · Wire up in `resource.actions.ts` — `crouton-vue`

**Edit path**
```ts
const { autoSave } = useCrouton()

JsonFormModalService.openModal({
  autoSave: autoSave.value,
  onAutoSave: autoSave.value
    ? (data) => api.save(recordId, data)
    : undefined,
  onClose: () => { resource.reload(); handleEvent('close', {}) },
})
```

**Create path** (stateful — no ID until first valid save)
```ts
let createdId: string | null = null

onAutoSave: async (data) => {
  if (createdId) {
    return api.save(createdId, data)
  }
  const result = await api.create(data)
  createdId = result[formDef.idField]
  resource.reload()   // row appears in table immediately
  return result
},
```

### 5 · Documentation

New docs section covering:
- What auto-save does and how the debounce works.
- Required fields and the create-mode lifecycle.
- The `crouton.json` `autoSave` flag and how to disable it.
- The status indicator states and what they mean.
- Error recovery via the Retry button.

---

## Files changed

| Package | File | Change |
|---------|------|--------|
| `crouton-forms-vue` | `src/composables/useAutoSave.ts` | **New** |
| `crouton-forms-vue` | `src/forms/modal/FormModal.properties.ts` | Add `autoSave` + `onAutoSave` props |
| `crouton-forms-vue` | `src/forms/modal/FormModal.vue` | Wire composable, update buttons + status indicator |
| `crouton-forms-vue` | `src/forms/modal/FormModalService.ts` | Pass props through |
| `crouton-codegen` | `src/config.ts` | Add `autoSave?: boolean` to `CroutonConfig` |
| `crouton-api` | module setup | Expose `autoSave` in `/_app/layout` response |
| `crouton-vue` | `src/composables/useCrouton.ts` | Add `autoSave` to `AppConfig`, read from layout |
| `crouton-vue` | `src/resource/resource.actions.ts` | Gate on global flag; stateful create/edit handlers |
| `docs` | auto-save section | New documentation |

---

## Edge cases

| Scenario | Behaviour |
|----------|-----------|
| Create modal closed before form is ever valid | No record created — zero orphan rows |
| Rapid typing | Debounce absorbs intermediate states — one request per 800 ms idle |
| Save error on create | `createdId` stays `null`; retry does another `POST` |
| Save error on update | Same `PATCH` is retried via the Retry button |
| `autoSave: false` in `crouton.json` | Classic Save/Cancel buttons, zero behaviour change |

---

## Labels

`enhancement` `forms` `ux`
