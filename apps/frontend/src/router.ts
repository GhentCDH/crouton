import { createRouter, createWebHistory } from "vue-router";
import { CroutonRouter } from "@ghentcdh/crouton-vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      children: [...CroutonRouter],
    },
  ],
});
