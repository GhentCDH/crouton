<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { computedAsync } from '../utils/computedAsync';
import { useCrouton } from '../composables/useCrouton';
import ResourceTable from './ResourceTable.vue';
import { UseResource } from './useResources';

const route = useRoute();
const router = useRouter();
const formId = computed(() => route.params['formId'] as string);
const crouton = useCrouton();

const id = computed(() => `${formId.value}_${Date.now()}`);
const config = computedAsync(() => crouton.getFormDef(formId.value as string));

const handleEvent = ({ event, data }: { event: string; data: any }) => {
  let querydata: Record<string, string | undefined> = { id: data?.id, event };
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

const initialLoad = (resource: UseResource) => {
  const id = route.query['id'] as string | undefined;
  const event = route.query['event'] as string | undefined;

  if (!event) return;

  if (event === 'create') resource.create();
  if (!id) return;

  switch (event) {
    case 'view':
      resource.view(id);
      break;
    case 'update':
      resource.edit(id);
      break;
    case 'delete':
      resource.delete(id);
      break;
  }
};
</script>

<template>
  <ResourceTable
    #resourceTable
    :form-id="formId"
    :initial-request-params="route.query"
    @handle-event="handleEvent"
    @on-request="onRequest"
    @initial-load="initialLoad"
  />
</template>
