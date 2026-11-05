import type { Ref } from 'vue';

import { JsonFormModalService } from '../forms';

export interface RelationCreateOptions {
  fetchOptions: Ref<any>;
  http: any;
  label: () => string;
  onCreated: (record: any) => void;
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
    const form = config!.form as any;
    if (!form) return;

    JsonFormModalService.openModal({
      schema: form.data,
      uiSchema: form.ui,
      modalTitle: `Create new ${label()}`,
      http,
      onClose: (result) => {
        if (!result || !result.valid) return;
        form.create(result.data).then((res: any) => onCreated(res));
      },
    });
  };

  return { onCreate };
};
