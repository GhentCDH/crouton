import { watch } from 'vue';
import { useRoute } from 'vue-router';

type RouterParams = 'sectionId' | 'workId';

/**
 * Composable to access and observe route params.
 * Must be called within a Vue setup context (component or Pinia store).
 *
 * @example
 * const routerParams = getRouteParam();
 *
 * // Read current value
 * const id = routerParams.get('workId');
 *
 * // React to changes (callback fires immediately with current value, then on each change)
 * routerParams.watch('sectionId', (id) => {
 *   dataStore.setId(id);
 * });
 */
export const getRouteParam = () => {
  const route = useRoute();

  /**
   * Watch a specific route param for changes.
   * Invokes the callback immediately with the current value, and again
   * whenever the param changes (skipping duplicate values).
   */
  const watchRouteParam = (
    key: RouterParams,
    callback: (value: string | undefined) => void,
  ) => {
    let previousValue = route.params[key];

    watch(
      () => route.params,
      (value) => {
        const nextValue = value[key];
        if (nextValue === previousValue) return;

        previousValue = nextValue;
        callback(nextValue as string);
      },
    );

    callback(previousValue as string);
  };

  return {
    /** Get the current value of a route param. */
    get: (key: RouterParams) => {
      return route.params[key] as string;
    },
    watch: watchRouteParam,
  };
};
