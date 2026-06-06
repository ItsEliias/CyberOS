// electron.vite.config.ts
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { index: resolve("src/main/main.ts") }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { preload: resolve("src/main/preload.ts") },
        output: { format: "cjs" }
      }
    }
  },
  renderer: {
    root: resolve("src/renderer"),
    plugins: [react()],
    resolve: {
      alias: { "@shared": resolve("src/shared") }
    },
    build: {
      rollupOptions: {
        input: { index: resolve("src/renderer/index.html") }
      }
    }
  }
});
export {
  electron_vite_config_default as default
};
