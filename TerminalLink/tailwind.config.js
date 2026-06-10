import { createRequire } from 'module'
const _require = createRequire(import.meta.url)
const preset = _require('../design-system/tailwind-preset.cjs')

/** @type {import('tailwindcss').Config} */
export default {
  presets: [preset],
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx}'],
}
