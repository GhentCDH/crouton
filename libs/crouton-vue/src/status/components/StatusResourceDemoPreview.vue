<template>
  <div
    class="layout-demo border border-base-300 rounded-lg overflow-hidden not-content"
  >
    <div
      class="bg-base-200 px-4 py-2 flex gap-1 text-sm font-medium flex-wrap"
    >
      <button
        v-for="tab in tabs"
        :key="tab"
        :class="[
          'px-3 py-1 rounded cursor-pointer border-0 bg-transparent',
          activeTab === tab
            ? 'bg-white shadow font-semibold'
            : 'opacity-60 hover:opacity-100',
        ]"
        @click="activeTab = tab"
      >
        {{ tab === 'uischema' ? 'UI Schema' : tab.charAt(0).toUpperCase() + tab.slice(1) }}
      </button>
    </div>

    <div class="p-4 min-h-32">
      <template v-if="activeTab === 'form'">
        <CroutonForm
          v-if="views"
          :views="views as any"
          :data="formData"
          v-model="formData"
          :http="api"
          :show-buttons="false"
        />
        <p v-else class="text-sm opacity-50 italic">No form schema generated.</p>
      </template>

      <template v-if="activeTab === 'view'">
        <CroutonForm
          v-if="views"
          :views="views as any"
          :data="formData"
          :http="api"
          :readonly="true"
          :show-buttons="false"
        />
        <p v-else class="text-sm opacity-50 italic">No view schema generated.</p>
      </template>

      <template v-if="activeTab === 'table'">
        <TableComponent
          v-if="props.def.schemas.table"
          id="layout-demo-table"
          :ui-schema="props.def.schemas.table.ui"
          :schema="props.def.schemas.table.data"
          :data="sampleRows"
          :hide-pagination="true"
        />
        <p v-else class="text-sm opacity-50 italic">No table schema generated.</p>
      </template>

      <template v-if="activeTab === 'json'">
        <p class="text-xs opacity-60 mb-1">
          Edit layout JSON — updates the demo live:
        </p>
        <textarea
          class="w-full font-mono text-xs border rounded p-2 h-64 block"
          :value="layoutJson"
          @input="onLayoutInput"
        />
        <ul
          v-if="parseErrors.length"
          class="text-red-600 text-xs mt-1 space-y-0.5"
        >
          <li v-for="err in parseErrors" :key="err">{{ err }}</li>
        </ul>
      </template>

      <template v-if="activeTab === 'uischema'">
        <pre class="text-xs overflow-auto bg-base-100 p-2 rounded border h-64 m-0">{{
          formUiSchema ? JSON.stringify(formUiSchema, null, 2) : 'No UI schema.'
        }}</pre>
      </template>
    </div>

    <div
      v-if="warnings.length"
      class="border-t border-base-300 px-4 py-2 bg-yellow-50"
    >
      <p class="text-xs font-semibold text-yellow-800 mb-1">Warnings:</p>
      <ul class="text-xs text-yellow-700 space-y-0.5 font-mono">
        <li v-for="w in warnings" :key="w">{{ w }}</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { TableComponent } from '@ghentcdh/crouton-forms-vue';

import CroutonForm from '../../forms/CroutonForm.vue';
import { useApi } from '../../composables/useApi';
import { StatusResourceDemoPreviewProperties } from './StatusResourceDemoPreview.properties';

type Tab = 'form' | 'view' | 'table' | 'json' | 'uischema';

const tabs: Tab[] = ['form', 'view', 'table', 'json', 'uischema'];

const props = defineProps(StatusResourceDemoPreviewProperties);

const api = useApi();
const activeTab = ref<Tab>('form');
const formData = ref<Record<string, any>>({});
const layoutJson = ref('');
const parseErrors = ref<string[]>([]);
const warnings = ref<string[]>([]);

const views = computed(() => props.def.schemas);
const formUiSchema = computed(() => props.def.schemas.form?.ui ?? null);
const sampleRows = ref<any[]>([]);

watch(
  () => props.def,
  (def) => {
    layoutJson.value = JSON.stringify(def.schemas.form?.ui ?? {}, null, 2);
    formData.value = {};
    parseErrors.value = [];
  },
  { immediate: true },
);

const onLayoutInput = (e: Event) => {
  const val = (e.target as HTMLTextAreaElement).value;
  layoutJson.value = val;
  try {
    JSON.parse(val);
    parseErrors.value = [];
  } catch (err) {
    parseErrors.value = [(err as Error).message];
  }
};
</script>
