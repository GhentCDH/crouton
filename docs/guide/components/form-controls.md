---
title: Form controls
---

<script setup>
import { ref } from 'vue';
import {
  Autocomplete,
  Checkbox,
  ColorInput,
  DatePicker,
  Input,
  InputNumber,
  Markdown,
  MultiSelect,
  SelectComponent,
  Textarea,
} from '@ghentcdh/crouton-vue';

const textValue = ref('');
const numberValue = ref(42);
const colorValue = ref('#3b82f6');
const textareaValue = ref('');
const checkboxValue = ref(false);
const selectValue = ref('');
const multiValue = ref(['a']);
const autocompleteValue = ref('');
const dateValue = ref('2026-08-14T00:00:00.000Z');
const dateTimeValue = ref();
const markdownValue = ref('Some **bold** and *italic* text.');

const selectOptions = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
  { value: 'c', label: 'Option C' },
];
const cityOptions = ['Antwerp', 'Bruges', 'Brussels', 'Ghent', 'Leuven', 'Liège', 'Namur'].map(
  (city) => ({ value: city.toLowerCase(), label: city }),
);
</script>

# Form controls

All controls are `v-model` driven and share `label`, `width`, `enabled` and error props.

## Text input

<ClientOnly>
<div class="demo">
  <Input v-model="textValue" label="Text input" placeholder="Type something…" width="w-64" />
  <Input v-model="textValue" label="Clearable" placeholder="Type to clear…" :clearable="true" width="w-64" />
  <Input v-model="textValue" label="Disabled" placeholder="Disabled" :enabled="false" width="w-64" />
  <Input v-model="textValue" label="With error" errors="This field is required" :is-touched="true" width="w-64" />
</div>
</ClientOnly>

```vue
<Input v-model="value" label="Clearable" :clearable="true" width="w-64" />
<Input v-model="value" label="With error" errors="This field is required" :is-touched="true" />
```

## Number & textarea

<ClientOnly>
<div class="demo">
  <InputNumber v-model="numberValue" label="Number" width="w-48" />
  <Textarea v-model="textareaValue" label="Textarea" placeholder="Enter text…" width="w-64" />
</div>
</ClientOnly>

```vue
<InputNumber v-model="count" label="Number" width="w-48" />
<Textarea v-model="notes" label="Textarea" width="w-64" />
```

## Color

Native color picker next to an editable hex value (`#rrggbb`). Used by `fieldInput.type: "color"`.

<ClientOnly>
<div class="demo">
  <ColorInput v-model="colorValue" label="Color" width="w-64" />
  <ColorInput v-model="colorValue" label="Disabled" :enabled="false" width="w-64" />
  <span class="demo-note">Value: {{ colorValue }}</span>
</div>
</ClientOnly>

```vue
<ColorInput v-model="color" label="Color" width="w-64" />
```

## Checkbox

<ClientOnly>
<div class="demo">
  <Checkbox v-model="checkboxValue" label="Checkbox" />
  <span class="demo-note">Value: {{ checkboxValue }}</span>
</div>
</ClientOnly>

```vue
<Checkbox v-model="checked" label="Checkbox" />
```

## Select

<ClientOnly>
<div class="demo">
  <SelectComponent v-model="selectValue" label="Select" :options="selectOptions" value-key="value" label-key="label" width="w-64" />
  <MultiSelect v-model="multiValue" label="Multi select" :options="selectOptions" width="w-64" />
</div>
</ClientOnly>

```vue
<SelectComponent v-model="value" label="Select" :options="options" value-key="value" label-key="label" />
<MultiSelect v-model="values" label="Multi select" :options="options" />
```

## Autocomplete

<ClientOnly>
<div class="demo">
  <Autocomplete v-model="autocompleteValue" label="Autocomplete" :options="cityOptions" placeholder="Type a city…" width="w-64" />
  <span class="demo-note">Value: {{ autocompleteValue || '—' }}</span>
</div>
</ClientOnly>

```vue
<Autocomplete v-model="city" label="Autocomplete" :options="cityOptions" placeholder="Type a city…" />
```

## Date picker

Values are ISO strings.

<ClientOnly>
<div class="demo">
  <DatePicker v-model="dateValue" label="Date" width="w-64" />
  <DatePicker v-model="dateTimeValue" label="Date + time" :with-time="true" width="w-64" />
  <DatePicker v-model="dateValue" label="Bounded (Aug 2026)" min="2026-08-01" max="2026-08-31" width="w-64" />
  <DatePicker v-model="dateValue" label="Disabled" :enabled="false" width="w-64" />
</div>
</ClientOnly>

```vue
<DatePicker v-model="date" label="Date + time" :with-time="true" />
<DatePicker v-model="date" label="Bounded" min="2026-08-01" max="2026-08-31" />
```

## Markdown

Rich editor built on TipTap, an optional peer dependency (`@tiptap/pm`, `@tiptap/starter-kit`, `@tiptap/vue-3`, `tiptap-markdown`). Without TipTap it falls back to a plain textarea. The value is a Markdown string.

<ClientOnly>
<div class="demo demo-stack">
  <Markdown v-model="markdownValue" label="Markdown" width="w-full" min-height="min-h-40" />
  <span class="demo-note">Value: {{ markdownValue }}</span>
</div>
</ClientOnly>

```vue
<Markdown v-model="text" label="Markdown" width="w-full" min-height="min-h-40" />
```
