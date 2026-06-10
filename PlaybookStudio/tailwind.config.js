import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const preset = require('../design-system/tailwind-preset.cjs')

/** @type {import('tailwindcss').Config} */
export default {
  presets: [preset],
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx}'],
}
