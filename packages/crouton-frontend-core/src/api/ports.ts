export interface HttpClient {
  get<T = any>(url: string, config?: any): Promise<{ data: T }>;
  post<T = any>(url: string, data?: any, config?: any): Promise<{ data: T }>;
  patch<T = any>(url: string, data?: any, config?: any): Promise<{ data: T }>;
  delete<T = any>(url: string, config?: any): Promise<{ data: T }>;
}

export interface Notifier {
  success(message: string): void;
  error(message: string): void;
  info(message: string): void;
  warning(message: string): void;
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface LinkOpener {
  open(href: string, blank?: boolean): void;
}
