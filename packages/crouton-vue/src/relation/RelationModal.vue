<script setup lang="ts">
import { Btn, Modal } from '@ghentcdh/ui';
import { computedAsync } from '../utils/computedAsync';
import { useResources } from '../resource';
import { TableComponent } from '@ghentcdh/json-forms-vue';
import { type PropType, shallowRef, watch } from 'vue';
import { useCrouton } from '../composables/useCrouton';
import { customCellRenderers } from '../resource/renderers';

const properties = defineProps({
  /** Title displayed in the modal header. */
  modalTitle: { type: String, required: true },
  /** Label for the close button. */
  closeLabel: { type: String, default: 'Close' },
  column: { type: Object, required: true },
  options: { type: Object, required: true },
  /** Callback invoked when the modal closes (with result or `null` on cancel). */
  onClose: {
    type: Function as PropType<() => void>,
    default: () => {
      //the default one
    },
  },
  /**
   * Show the Edit button.
   * The caller wires the action by listening to the `edit` event via `onEdit`
   * in the props object — Vue's v-bind spread in modalWrapper converts onXxx
   * keys into event handlers automatically.
   */
  canEdit: { type: Boolean, default: false },
  /**
   * Show the Delete button.
   * The caller wires the action by listening to the `delete` event via `onDelete`
   * in the props object.
   */
  canDelete: { type: Boolean, default: false },
  /** Initial form data to populate the form with. */
  data: { type: Object as PropType<any>, required: true },
});

const emits = defineEmits<{
  /** Emitted when the modal is closed (payload is the result, or `null` on cancel). */
  closeModal: [result: unknown | null];
}>();

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
