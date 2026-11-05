<template>
  <div class="card bg-base-100 shadow-sm">
    <div class="card-body">
      <h2
        v-if="$slots.title"
        class="card-title"
      >
        <slot name="title" />
      </h2>
      <p>
        <slot name="default" />
        <slot name="content" />
      </p>
      <div
        v-if="$slots.actions"
        class="card-actions justify-end"
      >
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup></script>
