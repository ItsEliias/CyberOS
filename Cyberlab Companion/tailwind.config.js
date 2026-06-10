import preset from '../design-system/tailwind-preset.cjs';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [preset],
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx,html}'],
}
