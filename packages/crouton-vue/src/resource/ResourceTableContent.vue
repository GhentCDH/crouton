<template>
  <template v-if="hideToolbar">
    <legend
      v-if="!hideTitle"
      class="w-full block flex flex-row space-between"
      :class="['fieldset-legend']"
    >
      <div class="flex-grow">
        {{ label ?? config.title }}
      </div>
      <div>
        <DownloadCsvButton
          v-if="showCsv"
          :columns="resource.csvColumns"
          :rows="resource.fetchAllRows"
          :file-name="csvFileName"
        />
        <Btn
          v-if="isDev"
          :icon="IconEnum.Edit"
          color="secondary"
          :outline="true"
          @click="emit('editSchema')"
        >
          <span class="whitespace-nowrap">{{
            t('table.editFields', 'Edit fields')
          }}</span>
        </Btn>
        <Btn
          v-if="configOps.create"
          data-testid="btn-create"
          :icon="IconEnum.Plus"
          @click="resource.create"
        >
          <span class="whitespace-nowrap">{{
            t('table.addRecord', 'Add record')
          }}</span>
        </Btn>
      </div>
    </legend>
  </template>
  <TableToolbar
    v-else
    :filter-schema="resource.filterSchema"
    :filters="resource.filter"
    :search="resource.search"
    :hide-search="hideSearch"
    :actions="resource.tableActions"
    @update-search="resource.onUpdateSearch"
    @update-filters="resource.onUpdateFilters"
  >
    <template #left>
      <span class="text-xl font-bold mr-4">{{ config.title }}</span>
    </template>
    <template #right>
      <DownloadCsvButton
        v-if="showCsv"
        :columns="resource.csvColumns"
        :rows="resource.fetchAllRows"
        :file-name="csvFileName"
      />
      <Btn
        v-if="isDev"
        :icon="IconEnum.Edit"
        color="secondary"
        :outline="true"
        @click="emit('editSchema')"
      >
        <span class="whitespace-nowrap">{{
          t('table.editFields', 'Edit fields')
        }}</span>
      </Btn>
      <Btn
        v-if="configOps.create"
        data-testid="btn-create"
        :icon="IconEnum.Plus"
        @click="resource.create"
      >
        <span class="whitespace-nowrap">{{
          t('table.addRecord', 'Add record')
        }}</span>
      </Btn>
    </template>
  </TableToolbar>
  <div class="h-6 flex items-center">
    <Transition name="crud-status">
      <span
        v-if="resource.lastAction"
        data-testid="crud-status"
        class="text-sm font-medium"
        :class="{
          'text-green-700':  resource.lastAction.type === 'success',
          'text-error':      resource.lastAction.type === 'error',
          'text-amber-600':  resource.lastAction.type === 'pending' || resource.lastAction.type === 'warning',
        }"
      >
        <span v-if="resource.lastAction.type === 'pending'">⏳</span>
        <span v-else-if="resource.lastAction.type === 'success'">✓</span>
        <span v-else-if="resource.lastAction.type === 'warning'">⚠️</span>
        <span v-else>✗</span>
        {{ resource.lastAction.text }}
      </span>
    </Transition>
  </div>
  <h2 v-if="tableHeading" class="text-xl font-bold mb-2">
    {{ tableHeading }}
  </h2>
  <component
    :is="tableComponent"
    v-bind="resource as any"
    :id="`form_table_${id}`"
    @refresh="emit('refresh')"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { TableToolbar } from '@ghentcdh/crouton-forms-vue';
import { Btn, IconEnum } from '@ghentcdh/crouton-ui-vue';

import { useCrouton } from '../composables/useCrouton';
import { DownloadCsvButton } from '../csv';
import { useLanguage } from '../i18n/useLanguage';
import { ResourceTableContentProperties } from './ResourceTableContent.properties';

const props = defineProps(ResourceTableContentProperties);
const emit = defineEmits(['editSchema', 'refresh']);
const { t } = useLanguage();
const configOps = computed(() => (props.config?.operations as Record<string, unknown>) ?? {});
const crouton = useCrouton();
const download = computed(
  () => props.resource.uiSchema?.options?.['download'] as { csv?: boolean; fileName?: string } | undefined,
);
// Per-table `layout.table.download.csv` wins over the global `rules.tableDownload.csv`; hidden by default.
const showCsv = computed(() => download.value?.csv ?? crouton.tableDownload.value?.csv ?? false);
const csvFileName = computed(
  () => download.value?.fileName ?? props.resource.id,
);
</script>

<style scoped>
.crud-status-enter-active,
.crud-status-leave-active {
  transition: opacity 0.6s ease;
}
.crud-status-enter-from,
.crud-status-leave-to {
  opacity: 0;
}
</style>
