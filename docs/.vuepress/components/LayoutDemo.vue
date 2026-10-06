<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import axios from 'axios';
import { buildViewsFromColumnTypes, JsonColumnSchema, LayoutSchema } from '@ghentcdh/crouton-core';
import CroutonForm from '../../../packages/crouton-vue/src/forms/CroutonForm.vue';
import { TableComponent } from '@ghentcdh/crouton-forms-vue';
import { LayoutDemoProperties } from './LayoutDemo.properties';
import { EXAMPLES } from './layout-examples';

const props = defineProps(LayoutDemoProperties);

type Tab = 'form' | 'view' | 'table' | 'json' | 'uischema';
const activeTab = ref<Tab>('form');
const warnings = ref<string[]>([]);
const parseErrors = ref<string[]>([]);
const layoutJson = ref('');
const formData = ref<Record<string, unknown>>({});

const preset = computed(() => EXAMPLES[props.example as keyof typeof EXAMPLES]);

const parsedColumns = computed(() =>
  preset.value?.columns.map((c: any) => JsonColumnSchema.parse(c)) ?? [],
);

watch(
  () => props.example,
  () => {
    layoutJson.value = JSON.stringify(preset.value?.layout ?? {}, null, 2);
    warnings.value = [];
    parseErrors.value = [];
    formData.value = {};
  },
  { immediate: true },
);

const parsedLayout = computed(() => {
  try {
    const result = LayoutSchema.safeParse(JSON.parse(layoutJson.value || '{}'));
    if (!result.success) {
      parseErrors.value = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
      return undefined;
    }
    parseErrors.value = [];
    return result.data;
  } catch {
    parseErrors.value = ['Invalid JSON'];
    return undefined;
  }
});

const views = computed(() => {
  const captured: string[] = [];
  const orig = console.warn;
  console.warn = (...args: any[]) => captured.push(args.join(' '));
  const result = buildViewsFromColumnTypes(parsedColumns.value, parsedLayout.value);
  console.warn = orig;
  warnings.value = captured;
  return result;
});

const tableView = computed(() => (views.value as any)?.table);
const formUiSchema = computed(() => (views.value as any)?.form?.ui_schema);

const SAMPLE_VALUES: Record<string, string[]> = {
  title:       ['Introduction', 'Chapter One', 'Appendix'],
  label:       ['Alpha', 'Beta', 'Gamma'],
  description: ['Short intro text', 'A longer description here', 'See notes'],
  status:      ['draft', 'published', 'draft'],
  authorName:  ['Alice', 'Bob', 'Carol'],
  authorEmail: ['alice@example.com', 'bob@example.com', 'carol@example.com'],
  body:        ['Body text…', 'More content…', 'Final paragraph…'],
  createdAt:   ['2024-01-01', '2024-03-15', '2024-06-30'],
  updatedAt:   ['2024-02-01', '2024-04-01', '2024-07-01'],
};

const sampleRows = computed(() =>
  [0, 1, 2].map((i) =>
    Object.fromEntries(
      parsedColumns.value.map((col: any) => [
        col.id,
        (SAMPLE_VALUES[col.id] ?? [`${col.id} ${i + 1}`, `${col.id} ${i + 2}`, `${col.id} ${i + 3}`])[i],
      ]),
    ),
  ),
);

const onTabClick = (tab: Tab) => { activeTab.value = tab; };
const onLayoutInput = (e: Event) => {
  layoutJson.value = (e.target as HTMLTextAreaElement).value;
};
</script>

<template>
  <ClientOnly>
    <div class="layout-demo border border-base-300 rounded-lg overflow-hidden my-4 not-content">
      <div class="bg-base-200 px-4 py-2 flex gap-1 text-sm font-medium flex-wrap">
        <button
          v-for="tab in (['form', 'view', 'table', 'json', 'uischema'] as Tab[])"
          :key="tab"
          :class="['px-3 py-1 rounded cursor-pointer border-0 bg-transparent', activeTab === tab ? 'bg-white shadow font-semibold' : 'opacity-60 hover:opacity-100']"
          @click="onTabClick(tab)"
        >{{ tab === 'uischema' ? 'UI Schema' : tab.charAt(0).toUpperCase() + tab.slice(1) }}</button>
      </div>
      <div class="p-4 min-h-32">
        <template v-if="activeTab === 'form'">
          <CroutonForm
            v-if="views"
            :views="(views as any)"
            :data="formData"
            v-model="formData"
            :http="axios"
            :show-buttons="false"
          />
          <p v-else class="text-sm opacity-50 italic">No form schema generated.</p>
        </template>
        <template v-if="activeTab === 'view'">
          <CroutonForm
            v-if="views"
            :views="(views as any)"
            :data="formData"
            :http="axios"
            :readonly="true"
            :show-buttons="false"
          />
          <p v-else class="text-sm opacity-50 italic">No view schema generated.</p>
        </template>
        <template v-if="activeTab === 'table'">
          <TableComponent
            v-if="tableView"
            id="layout-demo-table"
            :ui-schema="tableView.ui_schema"
            :schema="tableView.json_schema"
            :data="sampleRows"
            :hide-pagination="true"
          />
          <p v-else class="text-sm opacity-50 italic">No table schema generated.</p>
        </template>
        <template v-if="activeTab === 'json'">
          <p class="text-xs opacity-60 mb-1">Edit layout JSON — updates the demo live:</p>
          <textarea
            class="w-full font-mono text-xs border rounded p-2 h-64 block"
            :value="layoutJson"
            @input="onLayoutInput"
          />
          <ul v-if="parseErrors.length" class="text-red-600 text-xs mt-1 space-y-0.5">
            <li v-for="err in parseErrors" :key="err">{{ err }}</li>
          </ul>
        </template>
        <template v-if="activeTab === 'uischema'">
          <pre class="text-xs overflow-auto bg-base-100 p-2 rounded border h-64 m-0">{{ formUiSchema ? JSON.stringify(formUiSchema, null, 2) : 'No UI schema.' }}</pre>
        </template>
      </div>
      <div v-if="warnings.length" class="border-t border-base-300 px-4 py-2 bg-yellow-50">
        <p class="text-xs font-semibold text-yellow-800 mb-1">Warnings:</p>
        <ul class="text-xs text-yellow-700 space-y-0.5 font-mono">
          <li v-for="w in warnings" :key="w">{{ w }}</li>
        </ul>
      </div>
    </div>
  </ClientOnly>
</template>
