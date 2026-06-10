import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: { rollupOptions: { input: { main: resolve('src/main/main.ts') } } }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      // Electron preload scripts must be CommonJS — force CJS output
      // regardless of package.json "type": "module"
      rollupOptions: {
        input: { preload: resolve('src/main/preload.ts') },
        output: { format: 'cjs' },
      },
    },
  },
  renderer: {
    root: resolve('src/renderer'),
    build: { rollupOptions: { input: { index: resolve('src/renderer/index.html') } } },
    resolve: { alias: { '@shared': resolve('src/shared'), '@': resolve('src/renderer') } },
    plugins: [react()]
  }
})
