<template>
  <pre
    class="block overflow-auto text-sm"
    style="max-height: 200px"
  >
        {{ displayValue }}


      </pre>
</template>

<script setup lang="ts">
import { DisplayValueProperties } from './displayValue.properties';

defineProps(DisplayValueProperties);
</script>
