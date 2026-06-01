import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';
import path from 'path';

// Plugin to copy src/main/lib/ and root sources/ to out/main/lib/ after build
function copyMainLibPlugin() {
  function copyDir(src: string, dest: string) {
    if (!fs.existsSync(src)) return;
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      const s = path.join(src, entry.name);
      const d = path.join(dest, entry.name);
      if (entry.isDirectory()) copyDir(s, d);
      else fs.copyFileSync(s, d);
    }
  }
  return {
    name: 'copy-main-lib',
    closeBundle() {
      copyDir(resolve('src/main/lib'), resolve('out/main/lib'));
      copyDir(resolve('sources'), resolve('out/main/lib/sources'));
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
