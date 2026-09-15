import type { ExtractPublicPropTypes, PropType } from 'vue';

export const MessageStatus = {
  idle: 'idle',
  saving: 'saving',
  saved: 'saved',
  pending: 'pending',
  error: 'error',
} as const;

export type MessageStatusType = (typeof MessageStatus)[keyof typeof MessageStatus];

export const MessageProps = {
  status: { type: String as PropType<MessageStatusType>, required: false },
  message: { type: String, required: false },
};

export type MessagePropsType = ExtractPublicPropTypes<typeof MessageProps>;

export const MessageStatusLabel: Record<MessageStatusType, string> = {
  idle: '',
  saving: 'Saving…',
  saved: 'Saved ✓',
  pending: 'Fill required fields to save',
  error: 'Save failed',
};
