<template>
  <Btn
    v-if="label"
    :outline="true"
    color="custom"
    size="xs"
    class="px-5 text-gray-500 border-gray-300"
    @click="openDetails"
  >
    {{ label }}
  </Btn>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { Btn, ModalService } from '@ghentcdh/ui';
import RelationModal from './RelationModal.vue';
import { useResources } from '../resource';
import { computedAsync } from '../utils/computedAsync';
import { useCrouton } from '../composables/useCrouton';

const props = defineProps({
  data: { type: Object, required: true },
  column: { type: Object, required: true },
  options: { type: Object },
});

const value = computed(() => {
  return props.data[props.column.id];
});
const isNumberValue = computed(() => {
  return typeof value.value === 'number';
});

const label = computed(() => {
  const val = value.value;
  if (isNumberValue.value) {
    if (val === 1) return '1 record';
    else return `${val} records`;
  }

  if (typeof val === 'undefined' || typeof val === 'undefined' || val === null)
    return undefined;

  const key = props.column.options?.key;
  if (key) return val[key] ?? null;

  if (props.column.options?.format === 'keyValue') {
    return val[props.column.options.key];
  }

  return val;
});

const openDetails = () => {
  if (props.options?.relationType === 'manyToOne') return openDetailsManyToOne();
  return openDetailsManyToMany();
};

const config = computedAsync(() => {
  const resource = props.options?.resource;
  if (!resource) return Promise.resolve(null);

  return useCrouton().getFormByUri(resource);
});
const resource = computed(() => {
  return config.value ? useResources(config?.value, { readonly: true }) : null;
});

const openDetailsManyToOne = () => {
  resource.value?.resourceModal.view(value.value[props.options?.idKey]);
};

const openDetailsManyToMany = () => {
  ModalService.openModal<any, null>({
    component: RelationModal,
    props: {
      modalTitle: props.column.label,
      title: 'Related records',
      data: props.data,
      column: props.column,
      options: props.options,
      onClose: () => {
        // No action needed on close
      },
    },
  });
};
</script>
