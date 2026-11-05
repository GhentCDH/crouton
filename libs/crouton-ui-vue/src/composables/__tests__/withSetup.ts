import { createApp } from 'vue';

export const withSetup = (composable: () => void) => {
  let result: ReturnType<typeof composable>;
  const app = createApp({
    setup() {
      result = composable();
      return () => {
        //
      };
    },
  });
  app.mount(document.createElement('div'));
  return { result: result!, app };
};
