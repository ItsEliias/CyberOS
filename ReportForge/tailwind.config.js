/** @type {import('tailwindcss').Config} */
import preset from '../design-system/tailwind-preset.cjs'

export default {
  presets: [preset],
  content: ['./src/renderer/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ─── ReportForge accent (blue) ─────────────────────────────────
        accent: {
          DEFAULT: '#4a9eff',
          dim:     'rgba(74,158,255,0.55)',
          tint:    'rgba(74,158,255,0.08)',
          tint2:   'rgba(74,158,255,0.15)',
          border:  'rgba(74,158,255,0.30)',
          glow:    'rgba(74,158,255,0.28)',
        },

        // ─── Legacy compat ────────────────────────────────────────────
        bg: {
          base:        '#07080f',
          elevated:    '#131525',
          interactive: '#191c32',
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
        panel: '#0d0e18',
        muted: '#8b949e',
      },
      boxShadow: {
        glow:        '0 0 20px rgba(74,158,255,0.15)',
        'glow-sm':   '0 0 10px rgba(74,158,255,0.10)',
        'glow-accent':'0 0 8px  rgba(74,158,255,0.50)',
      },
    },
  },
  plugins: [],
}
