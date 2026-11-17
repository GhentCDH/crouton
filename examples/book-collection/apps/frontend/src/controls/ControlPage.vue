<template>
  <div class="p-6 flex flex-col gap-6" :data-testid="`control-page-${control}`">
    <h1 class="text-2xl font-bold">Control: {{ control }}</h1>
    <p v-if="!variants" data-testid="unknown-control">Unknown control "{{ control }}"</p>
    <section
      v-for="variant in variants"
      :key="variant.id"
      :data-testid="`variant-${variant.id}`"
      class="border rounded p-4 flex flex-col gap-2"
    >
      <h2 class="font-semibold">{{ variant.title }}</h2>
      <FormComponent
        :id="`form-${variant.id}`"
        :schema="variant.schema"
        :ui-schema="variant.uiSchema"
        :form-data="variant.formData"
        @change="values[variant.id] = $event"
      />
      <output data-testid="value">{{ JSON.stringify(values[variant.id] ?? variant.formData ?? {}) }}</output>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue';
import { useRoute } from 'vue-router';

import { FormComponent } from '@ghentcdh/crouton-vue';

import { controlVariants } from './index';

const route = useRoute();
const control = computed(() => String(route.params['control']));
const variants = computed(() => controlVariants[control.value]);
const values = reactive<Record<string, unknown>>({});
</script>
