import { ref, watchEffect } from 'vue';

/**
 * Minimal drop-in for @vueuse/core's computedAsync.
 * Tracks reactive dependencies inside `fn` and re-runs whenever they change.
 */
export function computedAsync<T>(
  fn: () => Promise<T>,
  initialValue?: T,
) {
  const result = ref<T | undefined>(initialValue);
  watchEffect(async () => {
    result.value = await fn();
  });
  return result;
}
