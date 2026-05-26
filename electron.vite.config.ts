import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';
import path from 'path';

// Plugin to copy src/main/lib/ CommonJS backend modules to out/main/lib/ after build
function copyMainLibPlugin() {
  return {
    name: 'copy-main-lib',
    closeBundle() {
      const src  = resolve('src/main/lib');
      const dest = resolve('out/main/lib');
      if (!fs.existsSync(src)) return;
      if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
      for (const file of fs.readdirSync(src)) {
        fs.copyFileSync(path.join(src, file), path.join(dest, file));
      }
    }
  };
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), copyMainLibPlugin()],
    build: {
      rollupOptions: {
        input : { index: resolve('src/main/main.ts') },
        external: [
          /^\.\/lib\//,
          /^\.\.\/lib\//
        ]
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: { preload: resolve('src/main/preload.ts') }
      }
    }
  },
  renderer: {
    root: resolve('src/renderer'),
    plugins: [react()],
    resolve: {
      alias: { '@shared': resolve('src/shared') }
    },
    build: {
      rollupOptions: {
        input: { index: resolve('src/renderer/index.html') }
      }
    }
  }
});
