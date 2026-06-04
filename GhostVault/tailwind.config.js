import preset from '../design-system/tailwind-preset.cjs';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [preset],
  content: ['./src/renderer/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        // ─── CyberOS Design Bible — Core Palette ─────────────────────────
        bg: {
          base:        '#0a0a0f',
          elevated:    '#12131a',
          interactive: '#1a1b26',
        },
        border: {
          subtle:  '#1e2030',
          default: '#2a3347',
        },
        text: {
          primary:   '#e2e8f0',
          secondary: '#8b949e',
          muted:     '#4a5568',
        },
        // ─── GhostVault Accent (#7bb8ff Soft Blue) ───────────────────────
        accent: {
          DEFAULT:  '#7bb8ff',
          emphasis: '#a8d4ff',
        },
        info:    '#7bb8ff',
        success: '#3fb950',
        warning: '#d29922',
        danger:  '#f85149',
        // ─── CSS-var fallbacks for theme system ──────────────────────────
        bg2:    'var(--bg2)',
        bg3:    'var(--bg3)',
        panel:  'var(--panel, var(--bg3))',
        muted:  'var(--text-muted)',
        dim:    'var(--text-dim)',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      borderRadius: {
        DEFAULT: '6px',
      },
      boxShadow: {
        glow:         '0 0 20px rgba(123, 184, 255, 0.15)',
        'glow-sm':    '0 0 10px rgba(123, 184, 255, 0.1)',
        'glow-accent':'0 0 8px rgba(123, 184, 255, 0.5)',
      },
      animation: {
        statusPulse: 'statusPulse 2s ease-out infinite',
      },
      keyframes: {
        statusPulse: {
          '0%':   { boxShadow: '0 0 0 0 var(--pulse-color, rgba(123, 184, 255, 0.4))' },
          '70%':  { boxShadow: '0 0 0 6px transparent' },
          '100%': { boxShadow: '0 0 0 0 transparent' },
        },
      },
    },
  },
  plugins: [],
};
