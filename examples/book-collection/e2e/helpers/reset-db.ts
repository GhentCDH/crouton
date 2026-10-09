import { request } from '@playwright/test';

export const resetDb = async (baseURL = `http://localhost:${process.env['BACKEND_PORT'] ?? '4444'}`) => {
  const context = await request.newContext({ baseURL });
  const res = await context.post('/_test/reset');
  if (!res.ok()) throw new Error(`DB reset failed: ${res.status()}`);
  await context.dispose();
};
