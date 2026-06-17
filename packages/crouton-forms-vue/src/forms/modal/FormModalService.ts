import type { SizeType } from '@ghentcdh/crouton-core';
import { ModalService } from '@ghentcdh/ui';

import type { FormModalProp, FormModalResult } from './FormModal.properties';
import FormModal from './FormModal.vue';
import type { FormEventPayload } from '../../composables/useFormEvents';
import type { HttpClient } from '../../http-client';
import { type ViewModalResult } from '../../view/modal/ViewModal.properties';
import ViewModal from '../../view/modal/ViewModal.vue';

export class JsonFormModalService {
  static openModal<DATA = any>({
    initialData,
    modalTitle,
    schema,
    uiSchema,
    modalSize,
    onClose,
    onEvents,
    http,
    renderers,
    autoSave,
    onAutoSave,
    onRefreshData,
  }: {
    initialData?: DATA;
    schema: any;
    uiSchema: any;
    modalSize?: SizeType;
    modalTitle: string;
    onClose: (result: FormModalResult) => void;
    onEvents?: (payload: FormEventPayload) => void;
    http?: HttpClient;
    renderers?: any[];
    /** Enable auto-save mode. Replaces Save/Cancel with Close + status indicator. */
    autoSave?: boolean;
    /** Called with form data on each debounced save. Required when `autoSave` is true. */
    onAutoSave?: (data: DATA) => Promise<any>;
  }) {
    ModalService.openModal<FormModalProp, FormModalResult>({
      component: FormModal,
      props: {
        schema,
        uiSchema,
        modalSize,
        data: initialData ?? {},
        modalTitle,
        onClose,
        onEvents,
        http,
        renderers,
        autoSave: autoSave ?? false,
        onAutoSave,
      },
    });
  }

  static openViewModal<DATA = any>({
    data,
    modalTitle,
    schema,
    uiSchema,
    modalSize,
    onClose,
    onEdit,
    onDelete,
    renderers,
    onView,
  }: {
    data?: DATA;
    schema: any;
    uiSchema: any;
    modalSize?: SizeType;
    renderers?: any[];
    modalTitle: string;
    onClose?: () => void;
    /**
     * Called when the user clicks Edit.
     * Passed as `onEdit` so Vue's v-bind spread in modalWrapper wires it as
     * a listener for the `edit` event emitted by ViewModal.
     */
    onEdit?: (data: DATA) => void;
    /**
     * Called when the user clicks Delete.
     * Passed as `onDelete` so Vue's v-bind spread in modalWrapper wires it as
     * a listener for the `delete` event emitted by ViewModal.
     */
    onDelete?: (data: DATA) => void;
    /**
     * Called when the user clicks view in the form.
     */
    onView?: (data: any) => void;
  }) {
    ModalService.openModal<any, ViewModalResult>({
      component: ViewModal,
      props: {
        schema,
        uiSchema,
        modalSize,
        data,
        modalTitle,
        onClose:
          onClose ??
          (() => {
            //
          }),
        // Boolean props drive button visibility — no `on` prefix so Vue passes
        // them as regular props, not event listeners.
        canEdit: !!onEdit,
        canDelete: !!onDelete,
        // `onEdit`/`onDelete` are intercepted by Vue's v-bind spread as event
        // handlers for ViewModal's declared 'edit'/'delete' emits.
        onEdit,
        onDelete,
        renderers,
        onView,
      },
    });
  }
}
