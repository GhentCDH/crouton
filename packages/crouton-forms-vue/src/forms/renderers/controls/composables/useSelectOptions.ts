import { useFormContext } from 'vee-validate';
import { type Ref, computed, ref, watch } from 'vue';

import type { AutocompleteAllOptions, ControlOptions } from '@ghentcdh/crouton-core';

import { useHttpClient } from '../../../../composables/useHttpClient';
import { useFetchOptions } from './useFetchOption';

/**
 * Option list for the select and multi-select renderers: the inline
 * `options` / `values`, or — when `uri` / `resource` is set — the list fetched
 * from the server (empty when that request fails).
 */
export const useSelectOptions = (appliedOptions: Ref<ControlOptions<'select'> | undefined>) => {
  const http = useHttpClient();
  const { values: formValues } = useFormContext();

  const isRemote = computed(() => !!appliedOptions.value?.uri || !!appliedOptions.value?.resource);
  const remoteOptions = ref<unknown[]>([]);

  watch(
    [appliedOptions, formValues],
    async ([opts]) => {
      if (!isRemote.value) return;
      const fetcher = await useFetchOptions(opts as unknown as AutocompleteAllOptions, http, formValues);
      if (!fetcher.fetchOptions) return;
      try {
        const results: unknown = await fetcher.fetchOptions('', new AbortController().signal);
        remoteOptions.value = Array.isArray(results) ? results : [];
      } catch {
        remoteOptions.value = [];
      }
    },
    { immediate: true, deep: true },
  );

  const options = computed<unknown[]>(() =>
    isRemote.value ? remoteOptions.value : (appliedOptions.value?.options ?? appliedOptions.value?.values ?? []),
  );

  return { options };
};
