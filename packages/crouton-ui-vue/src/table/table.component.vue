<template>
  <div class="border border-gray-200">
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead
          class="text-xs text-text-muted font-medium border-b border-gray-200 border-solid sticky top-0 rounded-md"
        >
          <tr class="border-b border-gray-200">
            <th
              v-if="multiselect"
              class="px-3 py-1 w-10 text-left border-r border-gray-200"
            >
              <input
                type="checkbox"
                :checked="allSelected"
                :indeterminate="someSelected"
                class="cursor-pointer"
                @change="toggleAll"
              />
            </th>
            <th
              v-for="column in displayColumns"
              :key="column.scope"
              class="relative px-3 py-1 text-left font-semibold text-text-accent hover:bg-gray-50 select-none border-r border-gray-200"
              :style="
                column.width
                  ? {
                      width: column.width,
                      maxWidth: column.width,
                      minWidth: column.width,
                    }
                  : { minWidth: '150px' }
              "
            >
              <SortHeader :column="column" v-bind="sort" @sort="onSort" />
            </th>
            <th
              class="sticky right-0 w-10 cursor-grab rounded-tr-md visible bg-white shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]"
            >
              &nbsp;
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td
              :colspan="displayColumns.length + 1 + (multiselect ? 1 : 0)"
              class="text-center p-2"
            >
              <span class="loading loading-bars loading-xs" />
            </td>
          </tr>
          <tr v-else-if="!data?.length">
            <td
              :colspan="displayColumns.length + 1 + (multiselect ? 1 : 0)"
              class="text-center p-8 font-bold"
            >
              No records found
            </td>
          </tr>
          <tr
            v-for="item in data"
            :key="item.id"
            :ui-id="`table_${item.id}`"
            class="hover:bg-gray-100 transition-none transition-colors border-b border-gray-200"
          >
            <td v-if="multiselect" class="py-1 px-3">
              <input
                type="checkbox"
                :checked="selectedIds.has(item.id)"
                class="cursor-pointer"
                @change="toggleRow(item)"
              />
            </td>
            <td
              v-for="column in displayColumns"
              :key="column.scope"
              class="py-1 px-3 text-sm overflow-hidden"
            >
              <div
                class="px-3 flex items-center gap-2 rounded-sm relative hover:border hover:bg-gray-50 hover:border-gray-200 border-transparent max-w-56"
                style="min-width: 100%; min-height: 38px"
              >
                <div
                  class="whitespace-nowrap overflow-hidden overflow-ellipsis"
                >
                  <component
                    :is="column.component"
                    v-bind="column"
                    :data="item"
                    :column="column"
                    :sort="sort"
                    :page="page"
                  />
                </div>
              </div>
            </td>
            <td
              class="align-middle p-0 sticky right-0 bg-white hover:bg-gray-50 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.05)]"
            >
              <span
                class="px-3 py-1 items-center justify-end gap-1 flex whitespace-nowrap"
              >
                <template v-for="action of defaultActions" :key="action.label">
                  <Btn
                    v-if="!action.visible || action.visible(item)"
                    :aria-label="action.tooltip ?? action.label"
                    :icon="action.icon"
                    :color="Color.secondary"
                    size="xs"
                    @click="action.action(item)"
                  >
                    <span v-if="action.label">{{ action.label }}</span>
                  </Btn>
                </template>
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <template v-if="page">
      <PaginationComponent
        class="p-3"
        :total-items="page.count"
        :items-per-page="page.pageSize"
        :current-page="page.page"
        @update-page="onUpdatePage"
        @update-page-size="onUpdatePageSize"
      />
    </template>
  </div>
</template>

<script lang="ts">
export default { inheritAttrs: false };
</script>

<script lang="ts" setup>
import { computed, ref, useAttrs, watch } from 'vue';

import SortHeader from './header/sort.header.vue';
import PaginationComponent from './pagination.component.vue';
import {
  TableComponentEmits,
  TableComponentProperties,
} from './table.component.properties';
import Btn from '../button/btn.vue';
import { Color } from '../const/colors';
import { IconEnum } from '../icons';

const properties = defineProps(TableComponentProperties);

// Multiselect
const selectedIds = ref<Set<any>>(new Set());

watch(
  () => properties.data,
  () => {
    selectedIds.value.clear();
  },
);

const allSelected = computed(
  () =>
    !!properties.data?.length &&
    properties.data.every((item) => selectedIds.value.has(item.id)),
);

const someSelected = computed(
  () =>
    !!properties.data?.some((item) => selectedIds.value.has(item.id)) &&
    !allSelected.value,
);

const toggleRow = (item: any) => {
  const next = new Set(selectedIds.value);
  if (next.has(item.id)) next.delete(item.id);
  else next.add(item.id);
  selectedIds.value = next;
  emits(
    'selectionChange',
    properties.data?.filter((d) => next.has(d.id)) ?? [],
  );
};

const toggleAll = () => {
  if (allSelected.value) {
    selectedIds.value = new Set();
  } else {
    selectedIds.value = new Set(properties.data?.map((item) => item.id) ?? []);
  }
  emits(
    'selectionChange',
    properties.data?.filter((d) => selectedIds.value.has(d.id)) ?? [],
  );
};

const defaultActions = computed(() => {
  const actions = properties.actions ?? [];
  if (hasView.value) {
    actions.push({
      tooltip: 'View',
      icon: IconEnum.View,
      action: view,
    });
  }
  if (hasEdit.value) {
    actions.push({
      tooltip: 'Edit',
      icon: IconEnum.Edit,
      action: edit,
    });
  }
  if (hasDelete.value) {
    actions.push({
      tooltip: 'Delete',
      icon: IconEnum.Delete,
      action: deleteFn,
    });
  }
  return actions;
});

const emits = defineEmits(TableComponentEmits);
const attrs = useAttrs();

const hasView = computed(() => 'onView' in attrs);
const hasEdit = computed(() => 'onEdit' in attrs);
const hasDelete = computed(() => 'onDelete' in attrs);

const view = (data: unknown) => {
  (attrs.onView as Function)?.(data);
};
const edit = (data: unknown) => {
  (attrs.onEdit as Function)?.(data);
};

const deleteFn = (data: unknown) => {
  (attrs.onDelete as Function)?.(data);
};

const onUpdatePage = (page: number) => {
  emits('updatePage', page);
};

const onUpdatePageSize = (size: number) => {
  emits('updatePageSize', size);
};

const onSort = (id: string) => {
  emits('sort', id);
};
</script>
