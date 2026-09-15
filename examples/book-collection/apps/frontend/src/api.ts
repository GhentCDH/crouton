import axios from 'axios';
import { getRuntimeConfig } from '@ghentcdh/crouton-vue';

export const useApi = () => {
  const env = getRuntimeConfig();
  return axios.create({
    baseURL: env.API_URL ?? '/api',
  });
};
