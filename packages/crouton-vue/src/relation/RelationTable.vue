<script setup lang="ts">
import { TableComponent } from '@ghentcdh/crouton-forms-vue';
import { RelationTableProperties } from './RelationTable.properties';

const props = defineProps(RelationTableProperties);

props.resource.reload();
</script>
<template>
  <fieldset class="fieldset">
    <legend
      class="w-full inline-block"
      :class="['fieldset-legend', 'p-0 h-0 leading-none']"
    >
      {{ label }}
    </legend>
    <div>
      <TableComponent v-bind="resource" :data="values" />
    </div>
  </fieldset>
</template>
