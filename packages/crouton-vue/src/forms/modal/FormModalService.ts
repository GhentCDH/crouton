import type { Component } from 'vue';
import type { SizeType } from '@ghentcdh/crouton-core';
import type {
  FormEventPayload,
  FormModalProp,
  FormModalResult,
  HttpClient,
  UniqueCheckFn,
  ViewModalResult,
} from '@ghentcdh/crouton-forms-vue';
import { ViewModal } from '@ghentcdh/crouton-forms-vue';
import { ModalService } from '@ghentcdh/crouton-ui-vue';

import FormModal from './FormModal.vue';

export class JsonFormModalService {
  static openModal<DATA = unknown>({
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
    uniqueCheck,
  }: {
    initialData?: DATA;
    schema: unknown;
    uiSchema: unknown;
    modalSize?: SizeType;
    modalTitle: string;
    onClose: (result: FormModalResult) => void;
    onEvents?: (payload: FormEventPayload) => void;
    http?: HttpClient;
    renderers?: unknown[];
    autoSave?: boolean;
    onAutoSave?: (data: DATA) => Promise<unknown>;
    onRefreshData?: () => Promise<unknown>;
    saveLabel?: string;
    uniqueCheck?: UniqueCheckFn | null;
  }) {
    ModalService.openModal<FormModalProp, FormModalResult>({
      component: FormModal as Component,
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
        uniqueCheck: uniqueCheck ?? undefined,
        ...(saveLabel && { saveLabel }),
      },
    });
  }

  static openViewModal<DATA = unknown>({
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
    http,
  }: {
    data?: DATA;
    http?: HttpClient;
    schema: unknown;
    uiSchema: unknown;
    modalSize?: SizeType;
    renderers?: unknown[];
    modalTitle: string;
    onClose?: () => void;
    onEdit?: (data: DATA) => void;
    onDelete?: (data: DATA) => void;
    onView?: (data: unknown) => void;
  }) {
    ModalService.openModal<Record<string, unknown>, ViewModalResult>({
      component: ViewModal as Component,
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
        http,
      },
    });
  }
}
