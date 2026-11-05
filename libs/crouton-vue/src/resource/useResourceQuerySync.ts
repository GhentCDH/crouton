import { shallowRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import type { UseResource } from './useResources';

export interface ResourceQuerySyncOptions {
  /** Prefix for the `id`/`event` query keys (e.g. `relation_`). */
  prefix?: string;
  /** Skip applying the query event when it does not belong to this view. */
  shouldApply?: (resource: UseResource) => boolean;
}

/**
 * Keeps a resource table in sync with the `?<prefix>id` / `?<prefix>event`
 * query parameters, and pushes new query values when the table emits an event.
 *
 * Shared by `ResourceView` (route-level) and `RelationTable` (prefixed keys
 * inside a form), which previously carried identical copies of this logic.
 */
export const useResourceQuerySync = (
  options: ResourceQuerySyncOptions = {},
) => {
  const route = useRoute();
  const router = useRouter();
  const prefix = options.prefix ?? '';
  const idKey = `${prefix}id`;
  const eventKey = `${prefix}event`;

  const resourceRef = shallowRef<UseResource | null>(null);

  const handleEvent = ({ event, data }: { event: string; data: any }) => {
    let querydata: Record<string, string | undefined> = {
      [idKey]: data?.id,
      [eventKey]: event,
    };
    if (event === 'close') {
      querydata = { [idKey]: undefined, [eventKey]: undefined };
    }
    router.push({ query: { ...route.query, ...querydata } });
  };

  const applyQueryEvent = (resource: UseResource) => {
    if (options.shouldApply && !options.shouldApply(resource)) {
      return;
    }

    const id = route.query[idKey] as string | undefined;
    const event = route.query[eventKey] as string | undefined;

    if (!event) {
      resource.closeForm(null);
      return;
    }

    if (event === 'create') {
      resource.create();
      return;
    }
    if (!id) return;

    switch (event) {
      case 'view':
        resource.view(id);
        break;
      case 'update':
        resource.edit(id);
        break;
      case 'delete':
        resource.delete(id);
        break;
    }
  };

  const initialLoad = (resource: UseResource) => {
    resourceRef.value = resource;
    applyQueryEvent(resource);
  };

  watch(
    () => ({ id: route.query[idKey], event: route.query[eventKey] }),
    () => {
      if (resourceRef.value) applyQueryEvent(resourceRef.value);
    },
    { immediate: true, once: true },
  );

  watch(
    () => route.query[eventKey],
    (newEvent, oldEvent) => {
      if (newEvent !== oldEvent && !newEvent) {
        resourceRef.value?.closeForm(null);
      }
    },
  );

  return { handleEvent, initialLoad };
};
