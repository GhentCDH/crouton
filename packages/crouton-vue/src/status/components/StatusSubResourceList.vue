<template>
  <div class="mt-2">
    <p class="text-xs font-medium text-base-content/60 mb-1">Sub-resources ({{ props.subResources.length }})</p>
    <table class="w-full text-xs border-collapse">
      <thead>
        <tr class="text-base-content/50 border-b border-base-300">
          <th class="text-left py-1 pr-2 font-normal">Column</th>
          <th class="text-left py-1 pr-2 font-normal">Name</th>
          <th class="text-left py-1 pr-2 font-normal">Path</th>
          <th class="text-left py-1 pr-2 font-normal">Type</th>
          <th class="text-left py-1 font-normal">Status</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="sub in props.subResources" :key="sub.column">
          <tr class="border-b border-base-200 hover:bg-base-200/50">
            <td class="py-1 pr-2 font-mono text-base-content/70">{{ sub.column }}</td>
            <td class="py-1 pr-2 text-base-content">{{ sub.name }}</td>
            <td class="py-1 pr-2 font-mono text-base-content/70">{{ sub.path }}</td>
            <td class="py-1 pr-2">
              <span
                v-if="sub.relationType"
                class="px-1.5 py-0.5 rounded text-[10px] bg-base-200 text-base-content/70"
              >{{ sub.relationType }}</span>
            </td>
            <td class="py-1">
              <span
                class="inline-block w-2 h-2 rounded-full mr-1"
                :class="sub.valid ? 'bg-success' : 'bg-error'"
              />
              <span v-if="!sub.valid" class="text-error">error</span>
              <span v-else class="text-base-content/50">ok</span>
            </td>
          </tr>
          <tr v-if="sub.error" :key="`${sub.column}-error`">
            <td colspan="5" class="pb-1 pl-2">
              <pre class="bg-base-200 rounded p-1.5 text-xs font-mono text-error overflow-x-auto whitespace-pre-wrap break-all">{{ sub.error }}</pre>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { StatusSubResourceListProperties } from './StatusSubResourceList.properties';

const props = defineProps(StatusSubResourceListProperties);
</script>
