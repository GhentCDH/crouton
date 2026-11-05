<template>
  <div>
    <button
      class="flex items-center gap-2 w-full p-3 rounded-lg border border-base-300 bg-base-200 hover:bg-base-300 transition-colors"
      @click="expanded = !expanded"
    >
      <svg
        class="w-4 h-4 transition-transform"
        :class="expanded ? 'rotate-180' : ''"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 14l-7 7m0 0l-7-7m7 7V3"
        />
      </svg>
      <span class="font-semibold text-base-content">{{ title }}</span>
      <span class="ml-auto text-sm text-base-content/60"
        >{{ groups.length }} enums</span
      >
    </button>

    <transition
      enter-active-class="transition-all duration-200"
      leave-active-class="transition-all duration-200"
      enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-screen"
      leave-from-class="opacity-100 max-h-screen"
      leave-to-class="opacity-0 max-h-0"
    >
      <div v-if="expanded" class="mt-2 space-y-2 pl-4 border-l-2 border-base-300">
        <div
          v-for="group in groups"
          :key="group.name"
          class="rounded p-3 bg-base-100 border border-base-300"
        >
          <h3 class="font-semibold text-sm text-base-content">{{ group.name }}</h3>
          <p class="text-xs text-base-content/60 mb-2">{{ group.category }}</p>
          <ul class="space-y-1">
            <li
              v-for="(val, idx) in group.values"
              :key="idx"
              class="text-sm text-base-content"
            >
              <span class="font-mono text-xs bg-base-200 px-2 py-1 rounded">
                {{ val.value }}
              </span>
              <span class="ml-2 text-base-content/70">{{ val.label }}</span>
            </li>
          </ul>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import { StatusEnumsGroupProperties } from './StatusEnumsGroup.properties';

defineProps(StatusEnumsGroupProperties);

const expanded = ref(false);
</script>
