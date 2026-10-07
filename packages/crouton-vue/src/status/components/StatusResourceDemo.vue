<template>
  <div class="border-t border-base-300 bg-base-100 p-4 space-y-4">
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <div
          class="text-xs font-semibold text-base-content/60 uppercase tracking-wide mb-1"
        >
          Resource JSON (raw)
        </div>
        <pre
          class="text-xs bg-base-200 rounded p-3 overflow-x-auto max-h-96"
          >{{ rawJson }}</pre>
      </div>

      <div>
        <div
          class="text-xs font-semibold text-base-content/60 uppercase tracking-wide mb-1"
        >
          Compiled definition
        </div>
        <pre
          class="text-xs bg-base-200 rounded p-3 overflow-x-auto max-h-96"
          >{{ compiledJson }}</pre>
      </div>

      <div>
        <StatusResourceDemoPreview v-if="def" :def="def" />
        <p v-else-if="loading" class="text-xs text-base-content/50 italic">Loading…</p>
        <p v-else class="text-xs text-base-content/50 italic">No compiled definition.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue';

import type { FormDef } from '../../composables/useCrouton';
import { useCrouton } from '../../composables/useCrouton';
import { StatusResourceDemoProperties } from './StatusResourceDemo.properties';
import StatusResourceDemoPreview from './StatusResourceDemoPreview.vue';

const props = defineProps(StatusResourceDemoProperties);

const crouton = useCrouton();
const def = ref<FormDef | null>(null);
const loading = ref(false);

watchEffect(async () => {
  loading.value = true;
  try {
    def.value = await crouton.getFormDefById(props.resource.name);
  } catch {
    def.value = null;
  } finally {
    loading.value = false;
  }
});

const rawJson = computed(() => JSON.stringify(props.resource, null, 2));
const compiledJson = computed(() =>
  def.value ? JSON.stringify(def.value, null, 2) : '',
);
</script>
