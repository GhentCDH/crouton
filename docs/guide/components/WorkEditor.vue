<script setup lang="ts">
/**
 * Demo custom component for page-mode display.
 *
 * Register this component in your app setup:
 *
 *   import WorkEditor from './components/WorkEditor.vue';
 *   import { createCrouton, customComponentIs } from '@ghentcdh/crouton-vue';
 *
 *   app.use(createCrouton(api, {
 *     customComponents: [
 *       { tester: customComponentIs('WorkEditor', 1), renderer: WorkEditor },
 *     ],
 *   }));
 *
 * Then reference it in resource.json:
 *
 *   { "display": { "mode": "page", "customComponent": "WorkEditor" } }
 */

const props = defineProps({
  schema: { type: Object, default: () => ({}) },
  uiSchema: { type: Object, default: () => ({}) },
  initialData: { type: Object, default: () => ({}) },
  data: { type: Object, default: () => ({}) },
  modalTitle: { type: String, default: '' },
});

const emit = defineEmits<{
  (e: 'close', result?: any): void;
  (e: 'save', data: any): void;
}>();
</script>

<template>
  <div class="work-editor">
    <header class="work-editor__header">
      <h2>{{ modalTitle }}</h2>
      <button type="button" @click="emit('close')">Close</button>
    </header>

    <section class="work-editor__body">
      <!--
        Replace this slot with your custom editing UI.
        `data` contains the current record, `schema` has the JSON Schema.
      -->
      <pre>{{ JSON.stringify(data, null, 2) }}</pre>
    </section>

    <footer class="work-editor__footer">
      <button type="button" @click="emit('save', data)">Save</button>
    </footer>
  </div>
</template>

<style scoped>
.work-editor {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
}

.work-editor__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.work-editor__body {
  flex: 1;
  overflow: auto;
}

.work-editor__footer {
  display: flex;
  justify-content: flex-end;
}
</style>
