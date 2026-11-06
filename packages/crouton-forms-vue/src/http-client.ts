export interface HttpClient {
  get<T = unknown>(url: string, config?: Record<string, unknown>): Promise<{ data: T }>;
  post<T = unknown>(url: string, data?: unknown, config?: Record<string, unknown>): Promise<{ data: T }>;
  patch<T = unknown>(url: string, data?: unknown, config?: Record<string, unknown>): Promise<{ data: T }>;
  delete<T = unknown>(url: string, config?: Record<string, unknown>): Promise<{ data: T }>;
}
