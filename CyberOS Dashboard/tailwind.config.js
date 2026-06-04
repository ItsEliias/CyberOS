/** @type {import('tailwindcss').Config} */
import preset from '../design-system/tailwind-preset.cjs'

export default {
  presets: [preset],
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // ── Legacy palette aliases (keep existing components working) ──────────
      colors: {
        bg: {
          base:        '#07080f',
          surface:     '#0d0e18',
          elevated:    '#131525',
          overlay:     '#191c32',
          interactive: '#1e2335',
        },
        border: {
          subtle:  '#1e2433',
          default: '#2a3347',
          strong:  '#3d4f6b',
        },
        text: {
          primary:   '#e6edf3',
          secondary: '#8b949e',
          muted:     '#484f58',
        },
        accent: {
          DEFAULT: '#4a9eff',
          emphasis: '#7bb8ff',
          dim: 'rgba(74,158,255,0.55)',
          tint: 'rgba(74,158,255,0.08)',
          tint2: 'rgba(74,158,255,0.15)',
          border: 'rgba(74,158,255,0.30)',
          glow: 'rgba(74,158,255,0.28)',
        },
        info:    '#4a9eff',
        success: '#3fb950',
        warning: '#d29922',
        danger:  '#f85149',
        // legacy
        panel:  '#161b27',
        muted:  '#8b949e',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
