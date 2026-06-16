<template>
  <Btn
    color="ghost"
    class="border-gray-300 text-primary h-8"
    :tooltip="'View'"
    @click="view"
  >
    <span class="px-2 flex gap-2 items-center">
      <span class="truncate">{{ displayValue }}</span>
      <Icon
        :icon="IconEnum.View"
        size="sm"
      />
    </span>
  </Btn>
</template>

<script setup lang="ts">
import { Btn, Icon, IconEnum } from '@ghentcdh/ui';

import { DisplayValueProperties } from './displayValue.properties';
import { useFormEvents } from '../../../../../composables/useFormEvents';

const props = defineProps(DisplayValueProperties);

const formEvents = useFormEvents();
const view = () => {
  formEvents.dispatch({
    event: 'view',
    type: props.path,
    data: props.value,
    options: props.options,
  });
};
</script>
