import type { Ref } from 'vue';

import type { HttpClient } from '@ghentcdh/crouton-forms-vue';
import { JsonFormModalService } from '../forms';

type FetchOptionsValue = {
  enableCreate?: boolean;
  form?: {
    data: unknown;
    ui: unknown;
    create: (data: unknown) => Promise<unknown>;
  };
};

export interface RelationCreateOptions {
  fetchOptions: Ref<FetchOptionsValue | null | undefined>;
  http: HttpClient;
  label: () => string;
  onCreated: (record: unknown) => void;
}

/**
 * Opens the create modal for an inline/autocomplete relation and forwards the
 * created record. Shared by `RelationAutocomplete` and `RelationInline`, which
 * carried identical create flows.
 */
export const useRelationCreate = ({
  fetchOptions,
  http,
  label,
  onCreated,
}: RelationCreateOptions) => {
  const onCreate = () => {
    const config = fetchOptions.value;
    if (config?.enableCreate === false) return;
    const form = config?.form;
    if (!form) return;

    JsonFormModalService.openModal({
      schema: form.data,
      uiSchema: form.ui,
      modalTitle: `Create new ${label()}`,
      http,
      onClose: (result) => {
        if (!result || !result.valid) return;
        form.create(result.data).then((res: unknown) => onCreated(res));
      },
    });
  };

  return { onCreate };
};
