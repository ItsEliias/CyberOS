// SignalBoard — tailwind.config.js
// Extends the root CyberOS design-system preset. createRequire bridges the
// CJS preset into this ESM config ("type":"module" in package.json).
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const preset = require('../design-system/tailwind-preset.cjs');

/** @type {import('tailwindcss').Config} */
export default {
  presets: [preset],
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
};
