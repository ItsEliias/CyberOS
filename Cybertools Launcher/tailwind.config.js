// Cybertools Launcher — tailwind.config.js
// Extends the root CyberOS design-system preset so all surface/text/border/
// app-accent utilities are available. createRequire bridges the CJS preset
// into this ESM config (package.json has "type":"module").
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const preset = require('../design-system/tailwind-preset.cjs');

/** @type {import('tailwindcss').Config} */
export default {
  presets: [preset],
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
};
