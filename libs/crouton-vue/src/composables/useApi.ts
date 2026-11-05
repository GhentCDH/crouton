import type { AxiosInstance } from 'axios';

let _api: AxiosInstance;

export const configureApi = (api: AxiosInstance) => {
  _api = api;
};

export const useApi = (): AxiosInstance => {
  if (!_api) throw new Error('[crouton] useApi() called before configureApi()');
  return _api;
};
