<script setup lang="ts">
import { RelationTableProperties } from './RelationTable.properties';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ResourceTable from '../resource/ResourceTable.vue';
import { useFormContext } from 'vee-validate';
import { UseResource } from '../resource/useResources';

const props = defineProps(RelationTableProperties);
const route = useRoute();
const router = useRouter();

const { values: formValues } = useFormContext();
props.resource.reload();

const defaultParams = computed(() => {
  return { parent: formValues };
});

const PREFIX = 'relation_';

const handleEvent = ({ event, data }: { event: string; data: any }) => {
  let querydata: Record<string, string | undefined> = {
    [`${PREFIX}id`]: data?.id,
    [`${PREFIX}event`]: event,
  };
  if (event === 'close') {
    querydata = {
      [`${PREFIX}id`]: undefined,
      [`${PREFIX}event`]: undefined,
    };
  }
  router.push({ query: { ...route.query, ...querydata } });
};

const resourceRef = ref<UseResource | null>(null);

const applyQueryEvent = (resource: UseResource) => {
  const id = route.query[`${PREFIX}id`] as string | undefined;
  const event = route.query[`${PREFIX}event`] as string | undefined;

  if (!event) {
    resource.closeForm(null);
    return;
  }

  if (event === 'create') {
    resource.create();
    return;
  }
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

const initialLoad = (resource: UseResource) => {
  resourceRef.value = resource;
  applyQueryEvent(resource);
};

watch(
  () => ({
    id: route.query[`${PREFIX}id`],
    event: route.query[`${PREFIX}event`],
  }),
  () => {
    if (resourceRef.value) applyQueryEvent(resourceRef.value);
  },
  { immediate: true, once: true },
);

watch(
  () => route.query[`${PREFIX}event`],
  (newEvent, oldEvent) => {
    if (newEvent !== oldEvent && !newEvent) {
      resourceRef.value?.closeForm(null);
    }
  },
);
</script>
<template>
  <ResourceTable
    v-if="resource"
    #resourceTable
    :hide-toolbar="true"
    :form-id="resource?.id"
    :default-uri-params="defaultParams"
    @handle-event="handleEvent"
    @initial-load="initialLoad"
  />
</template>
