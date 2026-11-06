import type { MaybeRefOrGetter, Ref } from 'vue';
import { ref, toValue, watch } from 'vue';

type FetchConfig = {
  fetchByValue?: ((value: unknown) => Promise<unknown>) | null;
  peekByValue?: ((value: unknown) => unknown) | null;
};

/**
 * Resolves the value an autocomplete renders.
 *
 * The underlying `Autocomplete` labels an object via `labelKey` but prints a
 * primitive verbatim, so a field storing only a scalar (`storeValue: true`)
 * would show a raw id when an existing record is edited. This resolves that
 * scalar back to its record for display only; the stored value stays
 * untouched.
 *
 * Shared by the JSON-forms autocomplete renderer and the relation autocomplete
 * in crouton-vue, which previously carried identical copies.
 */
export const useAutocompleteDisplayValue = (
  value: MaybeRefOrGetter<unknown>,
  fetchOptions: Ref<FetchConfig | null>,
  getLabelKey: () => string | undefined,
  getValueKey: () => string | undefined,
) => {
  const displayValue = ref<unknown>(toValue(value));

  const hydrateDisplayValue = async (val: unknown) => {
    const config = fetchOptions.value;

    // Nothing to resolve: empty, or the full object is already stored.
    if (
      val === null ||
      val === undefined ||
      val === '' ||
      typeof val === 'object'
    ) {
      displayValue.value = val;
      return;
    }

    const labelKey = getLabelKey();
    const valueKey = getValueKey();
    const fetchFn = config?.fetchByValue;
    if (!fetchFn || !labelKey || labelKey === valueKey) {
      displayValue.value = val;
      return;
    }

    const cached = config.peekByValue?.(val);
    if (cached !== undefined) {
      displayValue.value = cached ?? val;
      return;
    }

    // Keep what is on screen while resolving, unless it shows something else.
    const current = displayValue.value as Record<string, unknown> | null;
    const showsSameValue =
      !!current &&
      typeof current === 'object' &&
      !!valueKey &&
      current[valueKey] === val;
    if (!showsSameValue) displayValue.value = val;

    const record = await fetchFn(val);
    // The value changed while the request was in flight – drop the stale result.
    if (toValue(value) !== val) return;
    displayValue.value = record ?? val;
  };

  watch(
    [() => toValue(value), fetchOptions],
    ([val]) => hydrateDisplayValue(val),
    { immediate: true },
  );

  return { displayValue, hydrateDisplayValue };
};
