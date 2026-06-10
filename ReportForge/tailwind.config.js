// ReportForge — tailwind.config.js
// Extends the root CyberOS design-system preset. ESM interop with CJS preset
// works via Vite's module system in this app.
/** @type {import('tailwindcss').Config} */
import preset from '../design-system/tailwind-preset.cjs';

export default {
  presets: [preset],
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
};
