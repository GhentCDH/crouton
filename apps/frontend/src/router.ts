import { createRouter, createWebHistory } from 'vue-router';
import { CroutonRouter } from '@ghentcdh/crouton-vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      children: [...CroutonRouter],
    },
    {
      path: "/work",
      children: [
        { path: "", redirect: "/form/work" },
        {
          path: ":workId",
          children: [
            {
              path: "",
              redirect: (to) =>
                `/form/work?id=${to.params.workId}&event=update`,
            },
            {
              path: "section/:sectionId",
              component: () => import("./views/work/section-wrapper.vue"),
              children: [
                {
                  path: "",
                  name: "section-detail",
                  component: () => import("./views/work/section-detail.vue"),
                  // TODO  add texts here
                },
                {
                  path: "annotations",
                  name: "annotation-view",
                  children: [
                    {
                      path: "",
                      name: "annotation-editor",
                      component: () => import("./views/annotation/editor.vue"),
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});
