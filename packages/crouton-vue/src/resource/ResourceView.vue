<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import type { Request } from '../utils/request';
import ResourceTable from './ResourceTable.vue';
import { useResourceQuerySync } from './useResourceQuerySync';

const route = useRoute();
const router = useRouter();
const formId = computed(() => route.params['formId'] as string);

const { handleEvent, initialLoad } = useResourceQuerySync({
  shouldApply: (resource) => formId.value === resource.id,
});

const onRequest = (requestData: Request) => {
  router.push({
    query: {
      ...route.query,
      ...requestData,
    },
  });
};
</script>

<template>
  <div class="max-w-screen-xl m-auto p-4">
    <ResourceTable
      #resourceTable
      :form-id="formId"
      :initial-request-params="route.query"
      @handle-event="handleEvent"
      @on-request="onRequest"
      @initial-load="initialLoad"
    />
  </div>
</template>
