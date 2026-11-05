export type AlertType = 'success' | 'error' | 'info' | 'warning';

export type AlertModel = {
  message: string;
  type: AlertType;
};
