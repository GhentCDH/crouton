// tsup.config.ts
import { defineConfig } from "tsup";
import { readFile, writeFile } from "node:fs/promises";
const outDir = "../../dist/create-crouton";
const tsup_config_default = defineConfig({
  entry: ["src/index.ts"],
  outDir,
  format: ["esm"],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
  banner: {
    js: [
      "#!/usr/bin/env node",
      "import { createRequire as __createRequire } from 'module';",
      "const require = __createRequire(import.meta.url);"
    ].join("\n")
  },
  noExternal: ["commander", "@clack/prompts", "picocolors"],
  async onSuccess() {
    const pkg = JSON.parse(await readFile("./package.json", "utf8"));
    const distPkg = {
      name: pkg.name,
      version: pkg.version,
      description: "Scaffold a new crouton app from scratch",
      repository: pkg.repository,
      publishConfig: pkg.publishConfig,
      type: "module",
      bin: { "create-crouton": "index.js" }
    };
    await writeFile(`${outDir}/package.json`, `${JSON.stringify(distPkg, null, 2)}
`);
  }
});
export {
  tsup_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidHN1cC5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9faW5qZWN0ZWRfZmlsZW5hbWVfXyA9IFwiL3Nlc3Npb25zL3NoYXJwLWVsb3F1ZW50LWdvbGRiZXJnL21udC9hbm5vdGF0aW9ucy9jcm91dG9uL3BhY2thZ2VzL2NyZWF0ZS1jcm91dG9uL3RzdXAuY29uZmlnLnRzXCI7Y29uc3QgX19pbmplY3RlZF9kaXJuYW1lX18gPSBcIi9zZXNzaW9ucy9zaGFycC1lbG9xdWVudC1nb2xkYmVyZy9tbnQvYW5ub3RhdGlvbnMvY3JvdXRvbi9wYWNrYWdlcy9jcmVhdGUtY3JvdXRvblwiO2NvbnN0IF9faW5qZWN0ZWRfaW1wb3J0X21ldGFfdXJsX18gPSBcImZpbGU6Ly8vc2Vzc2lvbnMvc2hhcnAtZWxvcXVlbnQtZ29sZGJlcmcvbW50L2Fubm90YXRpb25zL2Nyb3V0b24vcGFja2FnZXMvY3JlYXRlLWNyb3V0b24vdHN1cC5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd0c3VwJztcbmltcG9ydCB7IHJlYWRGaWxlLCB3cml0ZUZpbGUgfSBmcm9tICdub2RlOmZzL3Byb21pc2VzJztcblxuY29uc3Qgb3V0RGlyID0gJy4uLy4uL2Rpc3QvY3JlYXRlLWNyb3V0b24nO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBlbnRyeTogWydzcmMvaW5kZXgudHMnXSxcbiAgb3V0RGlyLFxuICBmb3JtYXQ6IFsnZXNtJ10sXG4gIGR0czogZmFsc2UsXG4gIHNwbGl0dGluZzogZmFsc2UsXG4gIHNvdXJjZW1hcDogdHJ1ZSxcbiAgY2xlYW46IHRydWUsXG4gIGJhbm5lcjoge1xuICAgIGpzOiBbXG4gICAgICAnIyEvdXNyL2Jpbi9lbnYgbm9kZScsXG4gICAgICBcImltcG9ydCB7IGNyZWF0ZVJlcXVpcmUgYXMgX19jcmVhdGVSZXF1aXJlIH0gZnJvbSAnbW9kdWxlJztcIixcbiAgICAgICdjb25zdCByZXF1aXJlID0gX19jcmVhdGVSZXF1aXJlKGltcG9ydC5tZXRhLnVybCk7JyxcbiAgICBdLmpvaW4oJ1xcbicpLFxuICB9LFxuICBub0V4dGVybmFsOiBbJ2NvbW1hbmRlcicsICdAY2xhY2svcHJvbXB0cycsICdwaWNvY29sb3JzJ10sXG4gIGFzeW5jIG9uU3VjY2VzcygpIHtcbiAgICBjb25zdCBwa2cgPSBKU09OLnBhcnNlKGF3YWl0IHJlYWRGaWxlKCcuL3BhY2thZ2UuanNvbicsICd1dGY4JykpO1xuICAgIGNvbnN0IGRpc3RQa2cgPSB7XG4gICAgICBuYW1lOiBwa2cubmFtZSxcbiAgICAgIHZlcnNpb246IHBrZy52ZXJzaW9uLFxuICAgICAgZGVzY3JpcHRpb246ICdTY2FmZm9sZCBhIG5ldyBjcm91dG9uIGFwcCBmcm9tIHNjcmF0Y2gnLFxuICAgICAgcmVwb3NpdG9yeTogcGtnLnJlcG9zaXRvcnksXG4gICAgICBwdWJsaXNoQ29uZmlnOiBwa2cucHVibGlzaENvbmZpZyxcbiAgICAgIHR5cGU6ICdtb2R1bGUnLFxuICAgICAgYmluOiB7ICdjcmVhdGUtY3JvdXRvbic6ICdpbmRleC5qcycgfSxcbiAgICB9O1xuICAgIGF3YWl0IHdyaXRlRmlsZShgJHtvdXREaXJ9L3BhY2thZ2UuanNvbmAsIGAke0pTT04uc3RyaW5naWZ5KGRpc3RQa2csIG51bGwsIDIpfVxcbmApO1xuICB9LFxufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQWlZLFNBQVMsb0JBQW9CO0FBQzlaLFNBQVMsVUFBVSxpQkFBaUI7QUFFcEMsSUFBTSxTQUFTO0FBRWYsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsT0FBTyxDQUFDLGNBQWM7QUFBQSxFQUN0QjtBQUFBLEVBQ0EsUUFBUSxDQUFDLEtBQUs7QUFBQSxFQUNkLEtBQUs7QUFBQSxFQUNMLFdBQVc7QUFBQSxFQUNYLFdBQVc7QUFBQSxFQUNYLE9BQU87QUFBQSxFQUNQLFFBQVE7QUFBQSxJQUNOLElBQUk7QUFBQSxNQUNGO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNGLEVBQUUsS0FBSyxJQUFJO0FBQUEsRUFDYjtBQUFBLEVBQ0EsWUFBWSxDQUFDLGFBQWEsa0JBQWtCLFlBQVk7QUFBQSxFQUN4RCxNQUFNLFlBQVk7QUFDaEIsVUFBTSxNQUFNLEtBQUssTUFBTSxNQUFNLFNBQVMsa0JBQWtCLE1BQU0sQ0FBQztBQUMvRCxVQUFNLFVBQVU7QUFBQSxNQUNkLE1BQU0sSUFBSTtBQUFBLE1BQ1YsU0FBUyxJQUFJO0FBQUEsTUFDYixhQUFhO0FBQUEsTUFDYixZQUFZLElBQUk7QUFBQSxNQUNoQixlQUFlLElBQUk7QUFBQSxNQUNuQixNQUFNO0FBQUEsTUFDTixLQUFLLEVBQUUsa0JBQWtCLFdBQVc7QUFBQSxJQUN0QztBQUNBLFVBQU0sVUFBVSxHQUFHLE1BQU0saUJBQWlCLEdBQUcsS0FBSyxVQUFVLFNBQVMsTUFBTSxDQUFDLENBQUM7QUFBQSxDQUFJO0FBQUEsRUFDbkY7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
