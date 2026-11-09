import { type InjectionKey, inject } from 'vue';

import type { FormModalResult } from '../forms/modal/FormModal.properties';
import type { HttpClient } from '../http-client';

export type ModalOpenerOptions = {
  schema: unknown;
  uiSchema: unknown;
  modalTitle: string;
  http?: HttpClient;
  onClose: (result: FormModalResult) => void;
  [key: string]: unknown;
};

export const FORM_MODAL_OPENER_KEY: InjectionKey<(options: ModalOpenerOptions) => void> =
  Symbol('formModalOpener');

export const useModalOpener = () => inject(FORM_MODAL_OPENER_KEY, null);
