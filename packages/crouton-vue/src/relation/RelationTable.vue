<script setup lang="ts">
import { TableComponent } from '@ghentcdh/crouton-forms-vue';
import { RelationTableProperties } from './RelationTable.properties';
import { Btn, IconEnum } from '@ghentcdh/ui';

const props = defineProps(RelationTableProperties);

props.resource.reload();

const reload = () => {
  props.resource.reload();
};
</script>
<template>
  <fieldset class="fieldset">
    <legend class="w-full inline-block" :class="['fieldset-legend']">
      {{ label }}
    </legend>
    <div>
      <TableComponent v-bind="resource" @refresh="reload" />
      <div class="mt-2">
        <Btn
          v-if="resource.operations.create"
          :icon="IconEnum.Plus"
          @click="resource.create"
        >
          <span class="whitespace-nowrap">Add record</span>
        </Btn>
      </div>
    </div>
  </fieldset>
</template>
