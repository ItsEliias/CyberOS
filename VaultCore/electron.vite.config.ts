import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';
import path from 'path';

// Plugin to copy backend JS modules and sources/ to out/main/lib/ after build.
// Copies (in order, later wins on conflict):
//   1. Root-level CommonJS backend files (launcher.js, scraper.js, etc.)
//   2. src/main/lib/  — any TS-migration overrides (optional)
//   3. sources/       — scraper source handlers
function copyMainLibPlugin() {
  // Root-level CJS backend files that the TS main process requires via ./lib/
  const ROOT_BACKEND_FILES = [
    'launcher.js',
    'ecosystem-bus.js',
    'sourcelibrary.js',
    'vaulthealth.js',
    'conflict.js',
    'processor.js',
    'scraper.js',
  ];

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

  function syncLibFiles() {
    const destLib = resolve('out/main/lib');
    fs.mkdirSync(destLib, { recursive: true });

    // 1. Sync root-level backend CJS files into out/main/lib/
    for (const file of ROOT_BACKEND_FILES) {
      const src = resolve(file);
      if (fs.existsSync(src)) fs.copyFileSync(src, path.join(destLib, file));
    }

    // 2. Optional src/main/lib/ overrides (used during TS migration)
    copyDir(resolve('src/main/lib'), destLib);

    // 3. Scraper source handlers
    copyDir(resolve('sources'), path.join(destLib, 'sources'));
  }

  return {
    name: 'copy-main-lib',
    // generateBundle fires before write so files are ready when Electron starts
    generateBundle() { syncLibFiles(); },
    // closeBundle is a belt-and-suspenders fallback
    closeBundle()    { syncLibFiles(); }
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
      alias: {
        '@shared': resolve('src/shared'),
        '@': resolve('src/renderer'),
      }
    },
    build: {
      rollupOptions: {
        input: { index: resolve('src/renderer/index.html') }
      }
    }
  }
});
