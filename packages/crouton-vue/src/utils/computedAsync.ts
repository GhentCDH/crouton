import { type Ref, ref, watchEffect } from 'vue';

/**
 * Minimal drop-in for @vueuse/core's computedAsync.
 * Tracks reactive dependencies inside `fn` and re-runs whenever they change.
 */
export const computedAsync = <T>(
  fn: () => Promise<T>,
  initialValue?: T,
): Ref<T | undefined> => {
  const result = ref<T | undefined>(initialValue);
  watchEffect(async () => {
    result.value = await fn();
  });
  return result as Ref<T | undefined>;
};
