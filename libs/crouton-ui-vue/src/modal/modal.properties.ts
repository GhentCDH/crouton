import type { PropType } from 'vue';

import type { Size } from '../const';

export const ModalProperties = {
  modalTitle: { type: String, required: true as const },
  buttonLabel: { type: String },
  buttonSaveLabel: { type: String },
  data: { default: undefined },
  open: { type: Boolean, default: false as const },
  disableClose: { type: Boolean, default: false as const },
  width: { type: String as PropType<Size>, default: 'sm' },
};

export const ModalEmits = ['closeModal'];
