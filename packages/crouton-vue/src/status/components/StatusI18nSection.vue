<template>
  <section id="i18n">
    <h2 class="text-lg font-semibold mb-2 text-base-content">Translations</h2>
    <div class="rounded-lg border border-base-300 bg-base-100 overflow-hidden">
      <div class="flex items-center gap-2 p-3 border-b border-base-300 text-sm">
        <span
          class="inline-block w-2.5 h-2.5 rounded-full"
          :class="props.i18n.active ? 'bg-success' : 'bg-base-300'"
        />
        <span class="font-medium text-base-content">
          {{ props.i18n.active ? 'Active' : 'Inactive' }}
        </span>
        <span class="text-base-content/60">— default: {{ props.i18n.defaultLanguage }}</span>
      </div>
      <ul class="divide-y divide-base-300">
        <li
          v-for="b in props.i18n.bundles"
          :key="b.language"
          :id="`i18n-${b.language}`"
          class="flex items-center gap-2 p-3 text-sm"
        >
          <span class="rounded bg-base-200 px-1.5 py-0.5 font-mono text-xs text-base-content">
            {{ b.language }}
          </span>
          <span class="text-base-content/70">{{ b.keyCount }} keys</span>
          <span
            v-if="b.emptyKeys > 0"
            class="rounded bg-warning/10 text-warning border border-warning/40 px-1.5 py-0.5 text-xs font-medium"
          >
            {{ b.emptyKeys }} untranslated
          </span>
          <span
            v-else
            class="rounded bg-success/10 text-success border border-success/40 px-1.5 py-0.5 text-xs font-medium"
          >
            complete
          </span>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { StatusI18nSectionProperties } from './StatusI18nSection.properties';

const props = defineProps(StatusI18nSectionProperties);
</script>
