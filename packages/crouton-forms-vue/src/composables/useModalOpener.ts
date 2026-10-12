import { type InjectionKey, inject } from 'vue';

import type { HttpClient } from '@ghentcdh/crouton-frontend-core';

import type { FormModalResult } from '../forms/modal/FormModal.properties';

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
