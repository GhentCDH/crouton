import { ref } from 'vue';

import { default as ConfirmModal } from './confirmModal.vue';
import type {
  CloseProps,
  ConfirmModalProps,
  ConfirmResult,
  ModalWrapperModel,
} from './modal.model';

type ModalUnknown = ModalWrapperModel<CloseProps<unknown>, unknown>;

export class ModalService {
  private static instance: ModalService;

  public showModal = ref<boolean | number>(false);

  public modals: ModalUnknown[] = [];

  private openModal<PROPS extends CloseProps<RESULT>, RESULT>(
    modal: Omit<ModalWrapperModel<PROPS, RESULT>, 'id'>,
  ) {
    const onClose = modal.props.onClose;

    const id = crypto.randomUUID();
    const newModal = modal as unknown as ModalUnknown;

    modal.props.onClose = (result: RESULT) => {
      onClose(result);
      this.closeModal(id);
    };

    newModal.id = id;

    this.modals = [...this.modals, newModal];

    this.showModal.value = Date.now();
  }

  private closeModal(modalId: string) {
    this.modals = this.modals.filter((m) => m.id !== modalId);

    this.showModal.value = Date.now();
  }

  static showConfirm<
    PROPS extends ConfirmModalProps & CloseProps<ConfirmResult>,
  >(props: PROPS) {
    this.getInstance().openModal<PROPS, ConfirmResult>({
      component: ConfirmModal,
      props: props,
    });
  }

  static openModal<PROPS extends CloseProps<RESULT>, RESULT>(
    modal: Omit<ModalWrapperModel<PROPS, RESULT>, 'id'>,
  ) {
    this.getInstance().openModal(modal);
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new ModalService();
    }

    return this.instance;
  }

  static closeAll() {
    this.instance.closeAll();
  }

  private closeAll() {
    this.modals = [];
    this.showModal.value = false;
  }
}
