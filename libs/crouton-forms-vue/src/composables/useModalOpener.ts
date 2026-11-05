import { type InjectionKey, inject } from 'vue';

import type { FormModalResult } from '../forms/modal/FormModal.properties';
import type { HttpClient } from '../http-client';

export type ModalOpenerOptions = {
  schema: any;
  uiSchema: any;
  modalTitle: string;
  http?: HttpClient;
  onClose: (result: FormModalResult) => void;
  [key: string]: any;
};

export const FORM_MODAL_OPENER_KEY: InjectionKey<(options: ModalOpenerOptions) => void> =
  Symbol('formModalOpener');

export const useModalOpener = () => inject(FORM_MODAL_OPENER_KEY, null);
