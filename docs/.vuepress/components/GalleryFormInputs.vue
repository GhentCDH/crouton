<script setup lang="ts">
import { ref } from 'vue';
import {
  Autocomplete,
  Checkbox,
  Input,
  InputNumber,
  MultiSelect,
  SelectComponent,
  Textarea,
} from '@ghentcdh/crouton-ui-vue';
import { GalleryFormInputsProperties } from './GalleryFormInputs.properties';
import { SAMPLE_OPTIONS } from './sample-data';

const props = defineProps(GalleryFormInputsProperties);

const textValue = ref('');
const numberValue = ref(42);
const textareaValue = ref('');
const checkboxValue = ref(false);
const selectValue = ref('');
const multiSelectValue = ref<unknown[]>([]);
const autocompleteValue = ref<unknown>('');
const asyncAutocompleteValue = ref<unknown>('');

// Simulates an HTTP search so the loading state is visible.
const fetchCities = (query: string) =>
  new Promise((resolve) =>
    setTimeout(
      () =>
        resolve(
          SAMPLE_OPTIONS.filter((o) =>
            o.label.toLowerCase().includes(query.toLowerCase()),
          ),
        ),
      600,
    ),
  );
</script>

<template>
  <div class="flex flex-wrap gap-4 items-start">
    <Input :id="`${props.idPrefix}-text`" v-model="textValue" label="Text input" placeholder="Type something…" width="w-64" />
    <Input :id="`${props.idPrefix}-clearable`" v-model="textValue" label="Clearable" placeholder="Type to clear…" :clearable="true" width="w-64" />
    <Input :id="`${props.idPrefix}-disabled`" v-model="textValue" label="Disabled" placeholder="Disabled" :enabled="false" width="w-64" />
    <Input :id="`${props.idPrefix}-error`" v-model="textValue" label="With error" errors="This field is required" :is-touched="true" width="w-64" />
    <InputNumber :id="`${props.idPrefix}-number`" v-model="numberValue" label="Number" width="w-48" />
    <Textarea :id="`${props.idPrefix}-textarea`" v-model="textareaValue" label="Textarea" placeholder="Enter text…" width="w-64" />
    <Checkbox :id="`${props.idPrefix}-checkbox`" v-model="checkboxValue" label="Checkbox" />
    <SelectComponent
      :id="`${props.idPrefix}-select`"
      v-model="selectValue"
      label="Select"
      :options="SAMPLE_OPTIONS"
      value-key="value"
      label-key="label"
      width="w-64"
    />
    <MultiSelect
      :id="`${props.idPrefix}-multiselect`"
      v-model="multiSelectValue"
      label="Multiselect"
      :options="SAMPLE_OPTIONS"
      :clearable="true"
      width="w-64"
    />
    <Autocomplete
      :id="`${props.idPrefix}-autocomplete`"
      v-model="autocompleteValue"
      label="Autocomplete"
      placeholder="Search a city…"
      :options="SAMPLE_OPTIONS"
      :clearable="true"
      width="w-64"
    />
    <Autocomplete
      :id="`${props.idPrefix}-autocomplete-async`"
      v-model="asyncAutocompleteValue"
      label="Autocomplete (async)"
      placeholder="Search a city…"
      :options="[]"
      :fetch-options="fetchCities"
      :clearable="true"
      width="w-64"
    />
  </div>
</template>
