// ─── Props ────────────────────────────────────────────────────────────────────
import { ListProperties } from './ListResults.properties';
import { SelectProperties } from './SelectWrapper.properties';

export const AutocompleteProperties = {
  ...SelectProperties,
  ...ListProperties,
  /** v-model binding */
  modelValue: {
    type: [String, Object],
    default: '',
  },
  /**
   * HTTP mode: async function that receives the search string and returns
   * an array of strings or { label, value } objects.
   * e.g. :fetchOptions="(q) => fetch(`/api/search?q=${q}`).then(r => r.json())"
   */
  fetchOptions: {
    type: Function,
    default: null,
  },
  /** Debounce delay in ms for HTTP mode */
  debounceMs: {
    type: Number,
    default: 200,
  },
  /** How many results to show at once */
  maxResults: {
    type: Number,
    default: 8,
  },
  /** Allow free-text (don't clear input if nothing selected) */
  freeText: {
    type: Boolean,
    default: false,
  },
};
