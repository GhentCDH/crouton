import { ref } from 'vue';

import type { NotificationMessage, NotificationType } from './notification-message.ts';


const NOTIFICATION_DURATION = 5000;

export class NotificationService {
  private static instance: NotificationService;
  public notifications = ref<NotificationMessage[]>([]);

  private addNotification = (message: string, type: NotificationType = 'info') => {
    const notification: NotificationMessage = {
      id: crypto.randomUUID(),
      duration: NOTIFICATION_DURATION,
      message,
      type,
    };

    this.notifications.value.push(notification);

    this.removeNotificationAfterDuration(notification);
  };
  private removeNotificationAfterDuration = (notification: NotificationMessage) => {
    setTimeout(() => {
      this.removeNotification(notification.id);
    }, notification.duration);
  };

  private removeNotification = (id: string) => {
    this.notifications.value =  this.notifications.value.filter((n) => n.id !== id);
  };

  static getInstance() {
    if (!this.instance) {
      this.instance = new NotificationService();
    }
    return this.instance;
  }

  static info(message: string) {
    this.getInstance().addNotification(message, 'info');
  }

  static success(message: string) {
    this.getInstance().addNotification(message, 'success');
  }

  static warning(message: string) {
    this.getInstance().addNotification(message, 'warning');
  }

  static error(message: string) {
    this.getInstance().addNotification(message, 'error');
  }

  static removeNotification(id: string) {
    this.getInstance().removeNotification(id);
  }
}
