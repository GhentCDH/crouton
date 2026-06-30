<template>
  <div />
</template>
<script setup lang="ts">
import { watchEffect } from 'vue';
import { useRouter } from 'vue-router';

import { CROUTON_FORM } from '../router';
import { firstLeafId } from '../composables/sidebar';
import { useCrouton } from '../composables/useCrouton';

const router = useRouter();
const app = useCrouton();

watchEffect(() => {
  const formId = firstLeafId(app.sidebar);
  if (formId) {
    router.replace({ name: CROUTON_FORM, params: { formId } });
  }
});
</script>