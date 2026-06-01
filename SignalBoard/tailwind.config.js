/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#0e1117',
        panel:   '#161b22',
        border:  '#30363d',
        accent:  '#4a9eff',
        accent2: '#7bb8ff',
        text:    '#c9d1d9',
        muted:   '#8b949e',
        success: '#3fb950',
        warning: '#d29922',
        danger:  '#f85149',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
