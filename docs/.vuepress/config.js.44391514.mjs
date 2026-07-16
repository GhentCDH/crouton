// docs/.vuepress/config.js
import tailwindcss from "@tailwindcss/vite";
import { viteBundler } from "@vuepress/bundler-vite";
import { defineUserConfig } from "vuepress";
import { hopeTheme } from "vuepress-theme-hope";

// docs/guide/typedoc_sidebar.json
var typedoc_sidebar_default = ["/guide/actions", "/guide/backend", "/guide/cli", "/guide/datasource", "/guide/frontend", "/guide/getting-started", "/guide/hooks", "/guide/manual-setup", "/guide/resource-json", "/guide/styling"];

// docs/.vuepress/config.js
import { fileURLToPath } from "node:url";
var __vite_injected_original_import_meta_url = "file:///Users/bovandersteene/project/ugent/annotations/crouton/docs/.vuepress/config.js";
var config_default = defineUserConfig({
  base: process.env.DOCS_BASE ? `${process.env.DOCS_BASE}/` : "/",
  title: "Crouton",
  description: "Configure Resources Once, Use Them Over and Over, Naturally \u2014 schema-driven CRUD for NestJS + Vue",
  pagePatterns: ["**/*.md", "!.vuepress", "!**/node_modules"],
  lastUpdated: true,
  bundler: viteBundler({
    viteOptions: {
      plugins: [tailwindcss()],
      resolve: {
        alias: {
          "@ghentcdh/crouton-vue": fileURLToPath(
            new URL("../../packages/crouton-vue/src/index.ts", __vite_injected_original_import_meta_url)
          ),
          "@ghentcdh/crouton-forms-vue": fileURLToPath(
            new URL(
              "../../packages/crouton-forms-vue/src/index.ts",
              __vite_injected_original_import_meta_url
            )
          ),
          "@ghentcdh/crouton-core": fileURLToPath(
            new URL(
              "../../packages/crouton-core/src/index.ts",
              __vite_injected_original_import_meta_url
            )
          )
        }
      }
    },
    vuePluginOptions: {}
  }),
  theme: hopeTheme({
    docsRepo: "https://github.com/GhentCDH/crouton",
    docsBranch: "main",
    docsDir: "docs",
    lastUpdated: true,
    colorMode: "light",
    markdown: {
      mermaid: true
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/GhentCDH/crouton" }
    ],
    plugins: {
      mdEnhance: {
        tabs: true,
        codetabs: true,
        demo: true
      }
    },
    navbar: [{ text: "Home", link: "/" }],
    sidebar: [
      {
        text: "Guide",
        children: typedoc_sidebar_default
      }
      // Package reference sections (crouton-api / crouton-core / crouton-vue)
      // are disabled for now — re-enable by restoring the sidebar imports and
      // the copyMd/createMenu calls in tools/doc/vuepress.mjs.
    ]
  })
});
export {
  config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiZG9jcy8udnVlcHJlc3MvY29uZmlnLmpzIiwgImRvY3MvZ3VpZGUvdHlwZWRvY19zaWRlYmFyLmpzb24iXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvYm92YW5kZXJzdGVlbmUvcHJvamVjdC91Z2VudC9hbm5vdGF0aW9ucy9jcm91dG9uL2RvY3MvLnZ1ZXByZXNzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvYm92YW5kZXJzdGVlbmUvcHJvamVjdC91Z2VudC9hbm5vdGF0aW9ucy9jcm91dG9uL2RvY3MvLnZ1ZXByZXNzL2NvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvYm92YW5kZXJzdGVlbmUvcHJvamVjdC91Z2VudC9hbm5vdGF0aW9ucy9jcm91dG9uL2RvY3MvLnZ1ZXByZXNzL2NvbmZpZy5qc1wiO2ltcG9ydCB0YWlsd2luZGNzcyBmcm9tICdAdGFpbHdpbmRjc3Mvdml0ZSc7XG5pbXBvcnQgeyB2aXRlQnVuZGxlciB9IGZyb20gJ0B2dWVwcmVzcy9idW5kbGVyLXZpdGUnO1xuaW1wb3J0IHsgZGVmaW5lVXNlckNvbmZpZyB9IGZyb20gJ3Z1ZXByZXNzJztcbmltcG9ydCB7IGhvcGVUaGVtZSB9IGZyb20gJ3Z1ZXByZXNzLXRoZW1lLWhvcGUnO1xuXG5cbmltcG9ydCBndWlkZVNpZGVCYXIgZnJvbSAnLi4vZ3VpZGUvdHlwZWRvY19zaWRlYmFyLmpzb24nIHdpdGggeyB0eXBlOiAnanNvbicgfTtcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICdub2RlOnVybCc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZVVzZXJDb25maWcoe1xuICBiYXNlOiBwcm9jZXNzLmVudi5ET0NTX0JBU0UgPyBgJHtwcm9jZXNzLmVudi5ET0NTX0JBU0V9L2AgOiAnLycsXG4gIHRpdGxlOiAnQ3JvdXRvbicsXG4gIGRlc2NyaXB0aW9uOlxuICAgICdDb25maWd1cmUgUmVzb3VyY2VzIE9uY2UsIFVzZSBUaGVtIE92ZXIgYW5kIE92ZXIsIE5hdHVyYWxseSBcdTIwMTQgc2NoZW1hLWRyaXZlbiBDUlVEIGZvciBOZXN0SlMgKyBWdWUnLFxuICBwYWdlUGF0dGVybnM6IFsnKiovKi5tZCcsICchLnZ1ZXByZXNzJywgJyEqKi9ub2RlX21vZHVsZXMnXSxcbiAgbGFzdFVwZGF0ZWQ6IHRydWUsXG4gIGJ1bmRsZXI6IHZpdGVCdW5kbGVyKHtcbiAgICB2aXRlT3B0aW9uczoge1xuICAgICAgcGx1Z2luczogW3RhaWx3aW5kY3NzKCldLFxuICAgICAgcmVzb2x2ZToge1xuICAgICAgICBhbGlhczoge1xuICAgICAgICAgICdAZ2hlbnRjZGgvY3JvdXRvbi12dWUnOiBmaWxlVVJMVG9QYXRoKFxuICAgICAgICAgICAgbmV3IFVSTCgnLi4vLi4vcGFja2FnZXMvY3JvdXRvbi12dWUvc3JjL2luZGV4LnRzJywgaW1wb3J0Lm1ldGEudXJsKSxcbiAgICAgICAgICApLFxuICAgICAgICAgICdAZ2hlbnRjZGgvY3JvdXRvbi1mb3Jtcy12dWUnOiBmaWxlVVJMVG9QYXRoKFxuICAgICAgICAgICAgbmV3IFVSTChcbiAgICAgICAgICAgICAgJy4uLy4uL3BhY2thZ2VzL2Nyb3V0b24tZm9ybXMtdnVlL3NyYy9pbmRleC50cycsXG4gICAgICAgICAgICAgIGltcG9ydC5tZXRhLnVybCxcbiAgICAgICAgICAgICksXG4gICAgICAgICAgKSxcbiAgICAgICAgICAnQGdoZW50Y2RoL2Nyb3V0b24tY29yZSc6IGZpbGVVUkxUb1BhdGgoXG4gICAgICAgICAgICBuZXcgVVJMKFxuICAgICAgICAgICAgICAnLi4vLi4vcGFja2FnZXMvY3JvdXRvbi1jb3JlL3NyYy9pbmRleC50cycsXG4gICAgICAgICAgICAgIGltcG9ydC5tZXRhLnVybCxcbiAgICAgICAgICAgICksXG4gICAgICAgICAgKSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgICB2dWVQbHVnaW5PcHRpb25zOiB7fSxcbiAgfSksXG4gIHRoZW1lOiBob3BlVGhlbWUoe1xuICAgIGRvY3NSZXBvOiAnaHR0cHM6Ly9naXRodWIuY29tL0doZW50Q0RIL2Nyb3V0b24nLFxuICAgIGRvY3NCcmFuY2g6ICdtYWluJyxcbiAgICBkb2NzRGlyOiAnZG9jcycsXG4gICAgbGFzdFVwZGF0ZWQ6IHRydWUsXG4gICAgY29sb3JNb2RlOiAnbGlnaHQnLFxuICAgIG1hcmtkb3duOiB7XG4gICAgICBtZXJtYWlkOiB0cnVlLFxuICAgIH0sXG4gICAgc29jaWFsTGlua3M6IFtcbiAgICAgIHsgaWNvbjogJ2dpdGh1YicsIGxpbms6ICdodHRwczovL2dpdGh1Yi5jb20vR2hlbnRDREgvY3JvdXRvbicgfSxcbiAgICBdLFxuICAgIHBsdWdpbnM6IHtcbiAgICAgIG1kRW5oYW5jZToge1xuICAgICAgICB0YWJzOiB0cnVlLFxuICAgICAgICBjb2RldGFiczogdHJ1ZSxcbiAgICAgICAgZGVtbzogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSxcbiAgICBuYXZiYXI6IFt7IHRleHQ6ICdIb21lJywgbGluazogJy8nIH1dLFxuICAgIHNpZGViYXI6IFtcbiAgICAgIHtcbiAgICAgICAgdGV4dDogJ0d1aWRlJyxcbiAgICAgICAgY2hpbGRyZW46IGd1aWRlU2lkZUJhcixcbiAgICAgIH0sXG4gICAgICAvLyBQYWNrYWdlIHJlZmVyZW5jZSBzZWN0aW9ucyAoY3JvdXRvbi1hcGkgLyBjcm91dG9uLWNvcmUgLyBjcm91dG9uLXZ1ZSlcbiAgICAgIC8vIGFyZSBkaXNhYmxlZCBmb3Igbm93IFx1MjAxNCByZS1lbmFibGUgYnkgcmVzdG9yaW5nIHRoZSBzaWRlYmFyIGltcG9ydHMgYW5kXG4gICAgICAvLyB0aGUgY29weU1kL2NyZWF0ZU1lbnUgY2FsbHMgaW4gdG9vbHMvZG9jL3Z1ZXByZXNzLm1qcy5cbiAgICBdLFxuICB9KSxcbn0pO1xuIiwgIltcIi9ndWlkZS9hY3Rpb25zXCIsXCIvZ3VpZGUvYmFja2VuZFwiLFwiL2d1aWRlL2NsaVwiLFwiL2d1aWRlL2RhdGFzb3VyY2VcIixcIi9ndWlkZS9mcm9udGVuZFwiLFwiL2d1aWRlL2dldHRpbmctc3RhcnRlZFwiLFwiL2d1aWRlL2hvb2tzXCIsXCIvZ3VpZGUvbWFudWFsLXNldHVwXCIsXCIvZ3VpZGUvcmVzb3VyY2UtanNvblwiLFwiL2d1aWRlL3N0eWxpbmdcIl0iXSwKICAibWFwcGluZ3MiOiAiO0FBQTBYLE9BQU8saUJBQWlCO0FBQ2xaLFNBQVMsbUJBQW1CO0FBQzVCLFNBQVMsd0JBQXdCO0FBQ2pDLFNBQVMsaUJBQWlCOzs7QUNIMUIsK0JBQUMsa0JBQWlCLGtCQUFpQixjQUFhLHFCQUFvQixtQkFBa0IsMEJBQXlCLGdCQUFlLHVCQUFzQix3QkFBdUIsZ0JBQWdCOzs7QURPM0wsU0FBUyxxQkFBcUI7QUFQaU4sSUFBTSwyQ0FBMkM7QUFTaFMsSUFBTyxpQkFBUSxpQkFBaUI7QUFBQSxFQUM5QixNQUFNLFFBQVEsSUFBSSxZQUFZLEdBQUcsUUFBUSxJQUFJLFNBQVMsTUFBTTtBQUFBLEVBQzVELE9BQU87QUFBQSxFQUNQLGFBQ0U7QUFBQSxFQUNGLGNBQWMsQ0FBQyxXQUFXLGNBQWMsa0JBQWtCO0FBQUEsRUFDMUQsYUFBYTtBQUFBLEVBQ2IsU0FBUyxZQUFZO0FBQUEsSUFDbkIsYUFBYTtBQUFBLE1BQ1gsU0FBUyxDQUFDLFlBQVksQ0FBQztBQUFBLE1BQ3ZCLFNBQVM7QUFBQSxRQUNQLE9BQU87QUFBQSxVQUNMLHlCQUF5QjtBQUFBLFlBQ3ZCLElBQUksSUFBSSwyQ0FBMkMsd0NBQWU7QUFBQSxVQUNwRTtBQUFBLFVBQ0EsK0JBQStCO0FBQUEsWUFDN0IsSUFBSTtBQUFBLGNBQ0Y7QUFBQSxjQUNBO0FBQUEsWUFDRjtBQUFBLFVBQ0Y7QUFBQSxVQUNBLDBCQUEwQjtBQUFBLFlBQ3hCLElBQUk7QUFBQSxjQUNGO0FBQUEsY0FDQTtBQUFBLFlBQ0Y7QUFBQSxVQUNGO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxrQkFBa0IsQ0FBQztBQUFBLEVBQ3JCLENBQUM7QUFBQSxFQUNELE9BQU8sVUFBVTtBQUFBLElBQ2YsVUFBVTtBQUFBLElBQ1YsWUFBWTtBQUFBLElBQ1osU0FBUztBQUFBLElBQ1QsYUFBYTtBQUFBLElBQ2IsV0FBVztBQUFBLElBQ1gsVUFBVTtBQUFBLE1BQ1IsU0FBUztBQUFBLElBQ1g7QUFBQSxJQUNBLGFBQWE7QUFBQSxNQUNYLEVBQUUsTUFBTSxVQUFVLE1BQU0sc0NBQXNDO0FBQUEsSUFDaEU7QUFBQSxJQUNBLFNBQVM7QUFBQSxNQUNQLFdBQVc7QUFBQSxRQUNULE1BQU07QUFBQSxRQUNOLFVBQVU7QUFBQSxRQUNWLE1BQU07QUFBQSxNQUNSO0FBQUEsSUFDRjtBQUFBLElBQ0EsUUFBUSxDQUFDLEVBQUUsTUFBTSxRQUFRLE1BQU0sSUFBSSxDQUFDO0FBQUEsSUFDcEMsU0FBUztBQUFBLE1BQ1A7QUFBQSxRQUNFLE1BQU07QUFBQSxRQUNOLFVBQVU7QUFBQSxNQUNaO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFJRjtBQUFBLEVBQ0YsQ0FBQztBQUNILENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
