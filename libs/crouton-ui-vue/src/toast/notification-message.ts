export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export type NotificationMessage = {
  id: string;
  message: string;
  type: NotificationType;
  duration: number;
};
