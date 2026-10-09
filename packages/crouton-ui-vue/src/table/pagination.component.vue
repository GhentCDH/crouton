<template>
  <div class="flex items-center justify-between gap-4">
    <div class="flex gap-1">
      <PaginationButton
        v-bind="props"
        :page="1"
        label="<<"
        :current-page="currentPage"
        :never-active="true"
        :disabled="currentPage === 1"
        @update-page="goToPage"
      />
      <PaginationButton
        v-bind="props"
        :page="currentPage - 1"
        label="<"
        :current-page="currentPage"
        :never-active="true"
        :disabled="currentPage === 1"
        @update-page="goToPage"
      />
      <template
        v-for="page in pageNumbers"
        :key="page.page"
      >
        <PaginationButton
          v-bind="page"
          @update-page="goToPage"
        />
      </template>

      <PaginationButton
        v-bind="props"
        :page="currentPage + 1"
        label=">"
        :current-page="currentPage"
        :never-active="true"
        :disabled="props.currentPage === totalPages"
        @update-page="goToPage"
      />
      <PaginationButton
        v-bind="props"
        :page="totalPages"
        label=">>"
        :current-page="currentPage"
        :never-active="true"
        :disabled="props.currentPage === totalPages"
        @update-page="goToPage"
      />
    </div>
    <div class="flex items-center gap-4 text-xs text-base-content/60">
      <label class="flex items-center gap-2 whitespace-nowrap text-sm">
        Records per page:
        <select
          class="select select-xs select-bordered"
          :value="props.itemsPerPage"
          @change="onPageSizeChange"
        >
          <option
            v-for="size in pageSizeOptions"
            :key="size"
            :value="size"
          >
            {{ size }}
          </option>
        </select>
      </label>
      <span class="whitespace-nowrap">
        Showing {{ shownItems }} of {{ totalItems }} records</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

import type { PageProps } from './pagination-button.component.properties';
import PaginationButton from './pagination-button.component.vue';
import { PaginationComponentEmits, PaginationComponentProperties } from './pagination.component.properties';

const props = defineProps(PaginationComponentProperties);
const emit = defineEmits(PaginationComponentEmits);

const totalPages = computed(() => {
  let total = Math.ceil(props.totalItems / props.itemsPerPage);

  if (total < 1) return 1;
  return total;
});

const MIN_PAGES = 6;
const MIN_PAGES_HALF = MIN_PAGES / 2;

const hideRange = computed(() => {
  if (totalPages.value <= MIN_PAGES) {
    return {
      min: 1,
      max: totalPages.value,
    };
  }

  let min = props.currentPage - MIN_PAGES_HALF;

  if (min <= 1) {
    min = 1;
  } else if (min + MIN_PAGES > totalPages.value) {
    min = totalPages.value - MIN_PAGES;
  }

  let max = min + MIN_PAGES;

  return {
    min,
    max,
  };
});

const createDummyPage = (current: number) => {
  return {
    label: '...',
    currentPage: current,
    page: -10,
    disabled: true,
    neverActive: true,
  } as PageProps;
};

const pageNumbers = computed(() => {
  let total = totalPages.value;

  if (total < 1) total = 1;

  const current = props.currentPage;
  const pages: PageProps[] = [];
  const { min, max } = hideRange.value;

  Array.from({ length: total }, (_, i) => {
    const page = i + 1;

    if (page !== 1 && page !== total) {
      if (page > max) return;
      if (page < min) return;
    }

    if (page === total && total > 1 && max < total) {
      pages.push(createDummyPage(current));
    }
    pages.push({
      label: `${page}`,
      totalPages: total,
      currentPage: current,
      page: page,
    } as PageProps);

    if (page === 1 && total > 1 && min > 1) {
      pages.push(createDummyPage(current));
    }
  });

  return pages;
});

const shownItems = computed(() => {
  const start = (props.currentPage - 1) * props.itemsPerPage;
  return Math.min(start + props.itemsPerPage, props.totalItems);
});

const goToPage = (page: number) => {
  emit('updatePage', page);
};

const onPageSizeChange = (event: Event) => {
  const size = Number((event.target as HTMLSelectElement).value);
  emit('updatePageSize', size);
};
</script>
