<script setup lang="ts">
import { RelationTableProperties } from './RelationTable.properties';
import { computed } from 'vue';
import ResourceTable from '../resource/ResourceTable.vue';
import { useFormContext } from 'vee-validate';

const props = defineProps(RelationTableProperties);

const { values: formValues } = useFormContext();
props.resource.reload();

const reload = () => {
  props.resource.reload();
};
const form = computed(() => props.resource.form);
const defaultParams = computed(() => {
  return { parent: formValues };
});
</script>
<template>
  <ResourceTable
    v-if="resource"
    #resourceTable
    :hide-toolbar="true"
    :form-id="resource?.id"
    :default-uri-params="defaultParams"
  />
</template>
