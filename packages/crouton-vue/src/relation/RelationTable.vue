<script setup lang="ts">
import { TableComponent } from '@ghentcdh/crouton-forms-vue';
import { RelationTableProperties } from './RelationTable.properties';
import { Btn, IconEnum } from '@ghentcdh/ui';
import { computed } from 'vue';

const props = defineProps(RelationTableProperties);

props.resource.reload();

const reload = () => {
  props.resource.reload();
};
const form = computed(() => props.resource.form);
</script>
<template>
  <fieldset class="fieldset">
    <legend class="w-full inline-block" :class="['fieldset-legend']">
      {{ label }}
    </legend>
    <div v-if="form">
      <component
        :is="form.component"
        v-bind="form.config"
        @close-modal="resource.closeForm"
      >
        <template #content-after>
          <template v-if="form.customComponent">
            <component
              :is="form.customComponent"
              :resource="resource"
              v-bind="form.config"
            />
          </template>
        </template>
      </component>
    </div>
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
