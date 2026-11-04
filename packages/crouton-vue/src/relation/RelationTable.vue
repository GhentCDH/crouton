<script setup lang="ts">
import { useFormContext } from 'vee-validate';
import { computed } from 'vue';

import ResourceTable from '../resource/ResourceTable.vue';
import { useResourceQuerySync } from '../resource/useResourceQuerySync';
import { RelationTableProperties } from './RelationTable.properties';

const props = defineProps(RelationTableProperties);

const { values: formValues } = useFormContext();
props.resource.reload();

const defaultParams = computed(() => {
  return { parent: formValues };
});

const { handleEvent, initialLoad } = useResourceQuerySync({
  prefix: 'relation_',
});
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
