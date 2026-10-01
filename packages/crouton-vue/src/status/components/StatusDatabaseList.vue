<template>
  <section id="databases">
    <h2 class="text-lg font-semibold mb-2 text-base-content">Databases</h2>
    <p v-if="props.databases.length === 0" class="text-sm text-base-content/60">
      No databases configured.
    </p>
    <ul v-else class="rounded-lg border border-base-300 divide-y divide-base-300 overflow-hidden">
      <li
        v-for="db in props.databases"
        :key="db.name"
        :id="`db-${db.name}`"
        class="flex items-start gap-3 p-3"
      >
        <span
          class="inline-block w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
          :class="db.connected ? 'bg-success' : 'bg-error'"
        />
        <div class="flex-1 min-w-0 text-sm">
          <span class="font-medium text-base-content">{{ db.name }}</span>
          <p v-if="db.error" class="text-error mt-0.5 font-mono text-xs">{{ db.error }}</p>
        </div>
        <span
          class="text-xs px-2 py-0.5 rounded border"
          :class="db.connected
            ? 'text-success border-success/40 bg-success/10'
            : 'text-error border-error/40 bg-error/10'"
        >
          {{ db.connected ? 'connected' : 'down' }}
        </span>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { StatusDatabaseListProperties } from './StatusDatabaseList.properties';

const props = defineProps(StatusDatabaseListProperties);
</script>
