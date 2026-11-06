import type { Page } from '@playwright/test';

export const disableAnimations = async (page: Page): Promise<void> => {
  await page.addStyleTag({
    content: '*, *::before, *::after { animation-duration: 0s !important; transition-duration: 0s !important; }',
  });
};
