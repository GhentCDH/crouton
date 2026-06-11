<script setup lang="ts">
import {
  RelationModalEmits,
  RelationModalProperties,
} from './RelationModal.properties';
import { Btn, Modal } from '@ghentcdh/ui';
import { computedAsync } from '../utils/computedAsync';
import { useResources } from '../consumable/resource';
import { customCellRenderers } from '../table/cells';
import { TableComponent } from '@ghentcdh/json-forms-vue';
import { shallowRef, watch } from 'vue';
import { useCrouton } from '../consumable/useCrouton';

const properties = defineProps(RelationModalProperties);
const emits = defineEmits(RelationModalEmits);

const onCancel = () => {
  emits('closeModal', null);
};

const crouton = useCrouton();
const config = computedAsync(() =>
  crouton.getFormByUri(properties.options.schemasUri),
);

const handleEvent = (_event: string, _data: any) => {};

const resource = shallowRef<ReturnType<typeof useResources> | null>(null);

watch(
  config,
  (newConfig) => {
    if (newConfig) {
      resource.value = useResources(newConfig, {
        handleEvent,
        defaultUriParams: { parent: properties.data },
      });
    }
  },
  { immediate: true },
);

const create = () => {
  resource.value?.resourceModal.create();
};

const id = Date.now();
</script>
<template>
  <Modal
    v-bind="properties"
    :open="true"
    :disable-close="false"
    width="xl"
    @close-modal="onCancel"
  >
    <template v-if="config" #title>
      <div class="navbar bg-base-100 mb-4">
        <div class="navbar-start">
          <div class="text-xl font-bold">
            {{ config.title }}
          </div>
        </div>

        <div class="navbar-center" />
        <div class="navbar-end">
          <Btn v-if="config.operations.create" icon="Plus" @click="create">
            <span class="whitespace-nowrap"> Add record</span>
          </Btn>
        </div>
      </div>
    </template>
    <template #content>
      <TableComponent
        v-if="resource"
        :id="`form_table_${id}`"
        :cell-renderers="customCellRenderers"
        v-bind="resource"
      />
    </template>
    <template #actions>
      <Btn
        color="secondary"
        :outline="true"
        :aria-label="closeLabel"
        @click="onCancel"
      >
        {{ closeLabel }}
      </Btn>
    </template>
  </Modal>
</template>
