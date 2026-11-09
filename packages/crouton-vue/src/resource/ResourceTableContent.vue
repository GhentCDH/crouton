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
    :actions="resource.tableActions"
    @update-search="resource.onUpdateSearch"
    @update-filters="resource.onUpdateFilters"
    @action="resource.backendAction"
  >
    <template #left>
      <span class="text-xl font-bold mr-4">{{ config.title }}</span>
    </template>
    <template #right>
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
          'text-amber-600':  resource.lastAction.type === 'pending',
        }"
      >
        <span v-if="resource.lastAction.type === 'pending'">⏳</span>
        <span v-else-if="resource.lastAction.type === 'success'">✓</span>
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

import { useLanguage } from '../i18n/useLanguage';
import { ResourceTableContentProperties } from './ResourceTableContent.properties';

const props = defineProps(ResourceTableContentProperties);
const emit = defineEmits(['editSchema', 'refresh']);
const { t } = useLanguage();
const configOps = computed(() => (props.config?.operations as Record<string, unknown>) ?? {});
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
