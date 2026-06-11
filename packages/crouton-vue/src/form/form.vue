<script setup lang="ts">
import { computed, shallowRef, toRaw, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { TableComponent, TableToolbar } from '@ghentcdh/json-forms-vue';
import { computedAsync } from '../utils/computedAsync';
import { useCrouton } from '../consumable/useCrouton';

import { Btn, IconEnum } from '@ghentcdh/ui';
import { useResources } from '../consumable/resource';
import { Request } from '../utils/request';

const route = useRoute();
const router = useRouter();
const formId = computed(() => route.params['formId']);
const crouton = useCrouton();

const id = computed(() => `${formId.value}_${Date.now()}`);
const config = computedAsync(() => crouton.getFormDef(formId.value as string));

const handleEvent = (event, data: any) => {
  let querydata = { id: data?.id, event };
  if (event === 'close') {
    querydata = { id: undefined, event: undefined };
  }
  router.replace({ query: { ...route.query, ...querydata } });
};

const onRequest = (requestData: Request) => {
  router.replace({
    query: {
      ...route.query,
      ...requestData,
    },
  });
};

const resource = shallowRef(
  useResources(config.value, {
    initialRequestParams: { ...toRaw(route.query) },
    onRequest,
    handleEvent,
  }),
);

watch(
  () => config.value,
  (newConfig) => {
    resource.value = newConfig
      ? useResources(newConfig, {
          initialRequestParams: { ...toRaw(route.query) },
          onRequest,
          handleEvent,
        })
      : null;
  },
);

watch(
  () => resource.value,
  () => {
    const id = route.query['id'] as string | undefined;
    const event = route.query['event'] as string | undefined;

    if (!event) return;

    if (event === 'create') resource.value.resourceModal.create();
    if (!id) return;

    switch (event) {
      case 'view':
        resource.value.resourceModal.view(id);
        break;
      case 'update':
        resource.value.resourceModal.edit(id);
        break;
      case 'delete':
        resource.value.resourceModal.delete(id);
        break;
    }
  },
  { once: true },
);

const create = () => resource.value.resourceModal.create();
</script>

<template>
  <div class="max-w-screen-xl m-auto p-4" v-if="config && resource">
    <TableToolbar
      :filter-schema="resource.filterSchema"
      :filters="resource.filter"
      :search="resource.search"
      @update-search="resource.onUpdateSearch"
      @update-filters="resource.onUpdateFilters"
    >
      <template #left>
        <span class="text-xl font-bold mr-4">{{ config.title }}</span>
      </template>
      <template #right>
        <Btn
          v-if="config.operations.create"
          :icon="IconEnum.Plus"
          @click="create"
        >
          <span class="whitespace-nowrap">Add record</span>
        </Btn>
      </template>
    </TableToolbar>

    <TableComponent :id="`form_table_${id}`" v-bind="resource" />
  </div>
</template>
