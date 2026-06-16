import { type InjectionKey, inject, provide } from 'vue';

import type { HttpClient } from '../http-client';

const HTTP_CLIENT_KEY: InjectionKey<HttpClient> = Symbol('json-forms:http-client');

/**
 * Provide an HttpClient instance to all descendant renderers.
 * Call this in the component that hosts `<JsonForm>`.
 */
export const provideHttpClient = (http: HttpClient): void => {
  provide(HTTP_CLIENT_KEY, http);
};

/**
 * Inject the HttpClient inside a renderer.
 * Throws if no provider is found — consumers must provide one via `provideHttpClient`
 * or the `http` prop on `<JsonForm>` when using HTTP-dependent renderers.
 */
export const useHttpClient = (): HttpClient => {
  const http = inject(HTTP_CLIENT_KEY);
  if (!http) {
    throw new Error(
      '[json-forms] No HttpClient provided. Pass an `http` prop to <JsonForm> or call provideHttpClient() in a parent component.',
    );
  }
  return http;
};
