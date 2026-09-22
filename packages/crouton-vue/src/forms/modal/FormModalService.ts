import type { SizeType } from '@ghentcdh/crouton-core';
import { ModalService } from '@ghentcdh/ui';

import type {
  FormModalProp,
  FormModalResult,
} from '@ghentcdh/crouton-forms-vue';
import type { FormEventPayload } from '@ghentcdh/crouton-forms-vue';
import type { HttpClient } from '@ghentcdh/crouton-forms-vue';
import type { ViewModalResult } from '@ghentcdh/crouton-forms-vue';
import { ViewModal } from '@ghentcdh/crouton-forms-vue';

import FormModal from './FormModal.vue';

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
    saveLabel,
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
    autoSave?: boolean;
    onAutoSave?: (data: DATA) => Promise<any>;
    onRefreshData?: () => Promise<any>;
    saveLabel?: string;
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
        onRefreshData,
        ...(saveLabel && { saveLabel }),
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
    onEdit?: (data: DATA) => void;
    onDelete?: (data: DATA) => void;
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
        canEdit: !!onEdit,
        canDelete: !!onDelete,
        onEdit,
        onDelete,
        renderers,
        onView,
      },
    });
  }
}
