<template>
  <component :is="name" />
</template>

<script setup lang="ts">
import type { JsonSchema, UISchemaElement } from '@jsonforms/core';

const props = defineProps<{
  uischema: UISchemaElement;
  schema: JsonSchema;
}>();

const name = (props.uischema as any).options?.component as string;
</script>
