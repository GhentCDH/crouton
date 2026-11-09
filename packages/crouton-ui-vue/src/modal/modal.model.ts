export type ModalWrapperModel<PROPS extends CloseProps<RESULT>, RESULT> = {
  id: string;
  component: object;
  props: PROPS;
};

export type CloseProps<RESULT> = {
  onClose: (result: RESULT) => void;
};

export type ConfirmResult = {
  confirmed: boolean;
};

export type ConfirmModalProps = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
};
